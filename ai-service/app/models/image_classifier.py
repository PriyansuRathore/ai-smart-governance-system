import base64
import io
import os
import json
import urllib.request

HF_API_KEY  = os.environ.get("HF_API_KEY", "")
CLIP_URL    = "https://router.huggingface.co/hf-inference/models/openai/clip-vit-base-patch32"
HF_TEXT_URL = "https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli"

# ── All civic complaint labels → category ──────────────────────────────────
LABEL_CATEGORY_MAP = {
    # road
    "a pothole or crater on the road":                  "road",
    "damaged or cracked road surface":                  "road",
    "broken pavement or footpath":                      "road",
    "road blocked by debris or construction":           "road",
    "road accident or vehicle crash":                   "road",
    "missing road divider or barrier":                  "road",
    # water
    "water pipe leaking or burst":                      "water",
    "sewage or drain overflow on street":               "water",
    "flooded street or waterlogging":                   "water",
    "contaminated or dirty water":                      "water",
    "open or broken manhole":                           "water",
    "blocked drain or clogged gutter":                  "water",
    # garbage
    "garbage or waste dumped on street":                "garbage",
    "overflowing dustbin or garbage bin":               "garbage",
    "illegal waste dumping near water or park":         "garbage",
    "construction debris blocking footpath":            "garbage",
    "dead animal on road":                              "garbage",
    "open garbage causing disease or smell":            "garbage",
    # electricity
    "broken or fallen electric pole":                   "electricity",
    "electric wire hanging loose or sparking":          "electricity",
    "broken or dark streetlight":                       "electricity",
    "damaged transformer or electric box":              "electricity",
    "power outage in area":                             "electricity",
    "electric wire touching water or road":             "electricity",
    # emergency / medical
    "injured or bleeding person on road":               "emergency",
    "road accident victim needing help":                "emergency",
    "person collapsed or unconscious":                  "emergency",
    "medical emergency on street":                      "emergency",
    # fire
    "fire or building on fire":                         "fire",
    "vehicle on fire":                                  "fire",
    "garbage or waste burning":                         "fire",
    "electrical fire or transformer fire":              "fire",
    # building / structure
    "collapsed or cracked building wall":               "building",
    "dangerous or unsafe construction":                 "building",
    "broken public infrastructure":                     "building",
    "damaged school or hospital building":              "building",
    # tree / environment
    "fallen tree blocking road":                        "tree",
    "tree branch fallen on wire or car":                "tree",
    "overgrown tree blocking streetlight":              "tree",
    # stray animals
    "stray dogs or animals on road":                    "animal",
    "animal attack or dog bite":                        "animal",
    "dead animal carcass on street":                    "animal",
    # public property
    "broken public bench or park equipment":            "public_property",
    "damaged bus stop or shelter":                      "public_property",
    "broken public toilet or urinal":                   "public_property",
    "graffiti or vandalism on public wall":             "public_property",
    # noise / pollution
    "air pollution or smoke from factory":              "pollution",
    "noise pollution from construction or factory":     "pollution",
    "chemical waste or toxic dumping":                  "pollution",
}

CANDIDATE_LABELS = list(LABEL_CATEGORY_MAP.keys())

DEPARTMENT_MAP = {
    "road":            "Public Works Department",
    "water":           "Water Supply Department",
    "garbage":         "Sanitation Department",
    "electricity":     "Electricity Department",
    "emergency":       "Emergency & Medical Services",
    "fire":            "Fire Department",
    "building":        "Civil Engineering Department",
    "tree":            "Parks & Horticulture Department",
    "animal":          "Animal Control Department",
    "public_property": "Municipal Corporation",
    "pollution":       "Environment Department",
    "other":           "General Administration",
}

# Keyword map for fast text classification
KEYWORD_CATEGORY_MAP = {
    "road":            ["road", "pothole", "pavement", "footpath", "street", "highway", "bridge", "divider", "tar", "asphalt", "crack", "bump", "traffic", "jam", "congestion", "signal", "zebra crossing", "speed breaker"],
    "water":           ["water", "pipe", "leak", "flood", "sewage", "drain", "tap", "sewer", "manhole", "pipeline", "overflow", "waterlog", "drainage"],
    "garbage":         ["garbage", "waste", "trash", "litter", "dump", "dustbin", "bin", "rubbish", "debris", "compost", "sanitation", "smell"],
    "electricity":     ["electric", "electricity", "wire", "cable", "pole", "transformer", "streetlight", "light", "power", "voltage", "outage", "current", "sparking"],
    "emergency":       ["accident", "injured", "bleeding", "hurt", "victim", "crash", "wounded", "blood", "ambulance", "unconscious", "collapsed person"],
    "fire":            ["fire", "burning", "flame", "smoke", "blaze", "explosion", "burnt"],
    "building":        ["building", "wall", "collapse", "crack", "construction", "structure", "roof", "ceiling", "foundation"],
    "tree":            ["tree", "branch", "fallen tree", "overgrown", "uprooted"],
    "animal":          ["dog", "stray", "animal", "bite", "cattle", "cow", "monkey", "snake", "carcass"],
    "public_property": ["bench", "bus stop", "toilet", "urinal", "park", "graffiti", "vandalism", "shelter", "signboard"],
    "pollution":       ["pollution", "smoke", "chemical", "toxic", "noise", "factory", "air quality", "fumes"],
}


def _keyword_classify(text: str) -> dict | None:
    lower = text.lower()
    scores = {cat: 0 for cat in KEYWORD_CATEGORY_MAP}
    for cat, keywords in KEYWORD_CATEGORY_MAP.items():
        for kw in keywords:
            if kw in lower:
                scores[cat] += 1
    best = max(scores, key=scores.get)
    if scores[best] == 0:
        return None
    label_map = {
        "road":            "damaged road surface",
        "water":           "water or sewage issue",
        "garbage":         "garbage or waste",
        "electricity":     "electrical issue",
        "emergency":       "injured person or accident",
        "fire":            "fire or burning",
        "building":        "building or structure damage",
        "tree":            "fallen tree or branch",
        "animal":          "stray or dangerous animal",
        "public_property": "damaged public property",
        "pollution":       "pollution or toxic waste",
    }
    return {
        "category":   best,
        "label":      label_map.get(best, best),
        "confidence": min(scores[best] * 20, 90),
        "source":     "text-keyword",
        "department": DEPARTMENT_MAP.get(best, DEPARTMENT_MAP["other"]),
    }


def _clip_classify(image_b64: str) -> dict | None:
    """Send actual image to CLIP for real visual classification."""
    key = HF_API_KEY.strip()
    if not key or key == "your_hf_api_key_here":
        return None
    try:
        raw = image_b64.split(",", 1)[1] if "," in image_b64 else image_b64
        image_bytes = base64.b64decode(raw)

        # CLIP expects multipart form with image + candidate_labels
        boundary = "----FormBoundary7MA4YWxkTrZu0gW"
        labels_json = json.dumps(CANDIDATE_LABELS)

        body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="inputs"; filename="image.jpg"\r\n'
            f"Content-Type: image/jpeg\r\n\r\n"
        ).encode() + image_bytes + (
            f"\r\n--{boundary}\r\n"
            f'Content-Disposition: form-data; name="parameters"\r\n\r\n'
            f'{{"candidate_labels": {labels_json}}}'
            f"\r\n--{boundary}--\r\n"
        ).encode()

        req = urllib.request.Request(
            CLIP_URL, data=body,
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": f"multipart/form-data; boundary={boundary}",
            },
        )
        with urllib.request.urlopen(req, timeout=20) as r:
            data = json.loads(r.read())

        # Response: [{"label": ..., "score": ...}, ...]
        if not data or not isinstance(data, list):
            return None
        top = data[0]
        top_label = top["label"]
        top_score = round(top["score"] * 100, 1)
        if top_score < 10:
            return None
        category = LABEL_CATEGORY_MAP.get(top_label, "other")
        return {
            "category":   category,
            "label":      top_label,
            "confidence": top_score,
            "source":     "clip-vision",
            "department": DEPARTMENT_MAP.get(category, DEPARTMENT_MAP["other"]),
        }
    except Exception:
        return None


def _hf_text_classify(text: str) -> dict | None:
    """Zero-shot text classification via bart-large-mnli."""
    key = HF_API_KEY.strip()
    if not key or key == "your_hf_api_key_here":
        return None
    try:
        payload = json.dumps({
            "inputs": text,
            "parameters": {"candidate_labels": CANDIDATE_LABELS},
        }).encode()
        req = urllib.request.Request(
            HF_TEXT_URL, data=payload,
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read())
        if not data or not isinstance(data, list):
            return None
        top_label = data[0]["label"]
        top_score = round(data[0]["score"] * 100, 1)
        if top_score < 15:
            return None
        category = LABEL_CATEGORY_MAP.get(top_label, "other")
        return {
            "category":   category,
            "label":      top_label,
            "confidence": top_score,
            "source":     "huggingface-text",
            "department": DEPARTMENT_MAP.get(category, DEPARTMENT_MAP["other"]),
        }
    except Exception:
        return None


def predict_image_base64(image_b64: str, filename: str = "", description: str = "") -> dict:
    """
    Priority order:
    1. Keyword match on description  — instant, most reliable
    2. HF text zero-shot on description — semantic understanding
    3. CLIP vision on actual image   — real pixel-level analysis
    4. HF text on filename           — weak signal
    5. Fallback: other
    """
    # 1. Description keyword match
    if description.strip():
        result = _keyword_classify(description)
        if result:
            return result

    # 2. HF text on description
    if description.strip():
        result = _hf_text_classify(description)
        if result:
            return result

    # 3. CLIP on actual image — real visual analysis
    if image_b64:
        result = _clip_classify(image_b64)
        if result:
            return result

    # 4. HF text on filename
    hint = filename.replace("_", " ").replace("-", " ").replace(".", " ").strip()
    if hint:
        result = _hf_text_classify(hint)
        if result:
            return result

    # 5. Fallback
    return {
        "category":   "other",
        "label":      "unidentified civic issue",
        "confidence": None,
        "source":     "fallback",
        "department": DEPARTMENT_MAP["other"],
    }
