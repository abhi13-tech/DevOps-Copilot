import json
import os
import re
from typing import Dict

import requests


def analyze_logs_with_ai(logs: str) -> Dict[str, str]:
    """
    Sends logs to OpenAI Chat Completions API and expects a strict JSON response:
    {
        "root_cause": "...",
        "suggested_fix": "...",
        "confidence": "High|Medium|Low"
    }

    Falls back to a mocked response when API key is missing or request fails.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {
            "root_cause": "OpenAI API key not configured. Returning placeholder analysis.",
            "suggested_fix": "Set OPENAI_API_KEY and re-run analysis.",
            "confidence": "Low",
        }

    try:
        base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        url = f"{base_url.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        system_prompt = (
            "You are DevOps Copilot. Analyze CI/CD logs and return a concise JSON with keys"
            " root_cause, suggested_fix, and confidence (High/Medium/Low). Respond with only JSON."
        )
        user_prompt = (
            "Analyze the following GitHub Actions logs and identify the likely root cause and a fix.\n\n"
            + logs[:12000]  # trim to avoid excessive payload
        )
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }
        resp = requests.post(url, headers=headers, json=payload, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"].strip()
        # Attempt to parse JSON, tolerating code fences
        try:
            result = json.loads(content)
        except Exception:
            # Strip markdown code fences if present
            fenced = re.match(r"```(?:json)?\n(.*)\n```", content, re.DOTALL)
            if fenced:
                result = json.loads(fenced.group(1))
            else:
                # Fallback: extract the largest JSON-looking block
                start = content.find("{")
                end = content.rfind("}")
                if start != -1 and end != -1 and end > start:
                    result = json.loads(content[start:end+1])
                else:
                    raise
        # Normalize keys
        return {
            "root_cause": result.get("root_cause") or result.get("rootCause") or "Unknown",
            "suggested_fix": result.get("suggested_fix") or result.get("fix") or "Investigate further.",
            "confidence": result.get("confidence") or "Low",
        }
    except Exception:
        return {
            "root_cause": "Failed to reach OpenAI API or parse response.",
            "suggested_fix": "Check network connectivity and API key permissions.",
            "confidence": "Low",
        }
