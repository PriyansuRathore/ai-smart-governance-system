import re

# Hindi/Hinglish → English meaning map
# Covers common civic complaint words in Hindi transliteration
HINDI_MAP = {
    # water
    "nali":       "drain",
    "naali":      "drain",
    "paani":      "water",
    "pani":       "water",
    "pipe":       "pipe",
    "toot":       "broken",
    "tooti":      "broken",
    "toota":      "broken",
    "beh":        "leaking",
    "beh raha":   "leaking",
    "ruk":        "blocked",
    "ruka":       "blocked",
    "band":       "blocked",
    "ganda":      "dirty",
    "gandha":     "dirty",
    "sewage":     "sewage",
    "barsat":     "flood",
    "baarish":    "rain flood",
    "jal":        "water",
    "jal bhar":   "waterlogging",
    "nikasi":     "drainage",
    "tapka":      "leaking",
    "tapak":      "leaking",
    # road
    "sadak":      "road",
    "sarak":      "road",
    "rasta":      "road",
    "gaddha":     "pothole",
    "gadha":      "pothole",
    "khada":      "pothole",
    "toot gaya":  "broken road",
    "tuta":       "broken",
    "pul":        "bridge",
    "footpath":   "footpath",
    "traffic":    "traffic",
    "jam":        "traffic jam",
    "signal":     "traffic signal",
    "divider":    "divider",
    # electricity
    "bijli":      "electricity",
    "light":      "electricity",
    "nahi hai":   "not working",
    "nahi ata":   "not coming",
    "nahi aati":  "not coming",
    "gul":        "power cut",
    "transformer":"transformer",
    "wire":       "wire",
    "khamba":     "electric pole",
    "pole":       "pole",
    "current":    "electricity",
    "voltage":    "voltage",
    "shock":      "electric shock",
    "street light":"streetlight",
    # garbage
    "kachra":     "garbage",
    "kachra":     "garbage",
    "safai":      "cleaning",
    "safa":       "cleaning",
    "nahi hua":   "not done",
    "pada hai":   "lying around",
    "dher":       "garbage pile",
    "dustbin":    "dustbin",
    "bhari":      "overflowing",
    "bhar":       "overflowing",
    "gandagi":    "filth garbage",
    "kooda":      "garbage",
    "kuda":       "garbage",
    # emergency
    "accident":   "accident",
    "chot":       "injury",
    "laga":       "injured",
    "khoon":      "bleeding",
    "ambulance":  "ambulance",
    "madad":      "help emergency",
    "bachao":     "help emergency",
    "hospital":   "hospital",
    # fire
    "aag":        "fire",
    "jal raha":   "burning fire",
    "dhuan":      "smoke fire",
    "blast":      "explosion fire",
    # tree
    "ped":        "tree",
    "daali":      "branch tree",
    "gira":       "fallen",
    "gir gaya":   "fallen",
    "ukhad":      "uprooted tree",
    # animal
    "kutta":      "stray dog",
    "kutte":      "stray dogs",
    "awara":      "stray animal",
    "saanp":      "snake",
    "bandar":     "monkey",
    "gadha":      "cattle",
    # pollution
    "dhuaan":     "smoke pollution",
    "pradushan":  "pollution",
    "shor":       "noise pollution",
    "badbu":      "smell pollution",
    "bdboo":      "smell pollution",
}

# Common typo/shorthand normalizations
TYPO_MAP = {
    "rd":        "road",
    "elec":      "electricity",
    "electrcity":"electricity",
    "electricty":"electricity",
    "garbge":    "garbage",
    "garb":      "garbage",
    "wateer":    "water",
    "watr":      "water",
    "pothole":   "pothole",
    "pot hole":  "pothole",
    "strt":      "street",
    "str":       "street",
    "bldg":      "building",
    "blding":    "building",
    "acc":       "accident",
    "accidnt":   "accident",
    "lite":      "light",
    "lght":      "light",
    "drn":       "drain",
    "drng":      "drainage",
    "plz":       "please",
    "asap":      "urgent",
    "v bad":     "very bad",
    "vry bad":   "very bad",
    "no water":  "water not coming",
    "no light":  "electricity not working",
    "no power":  "power outage",
}


def clean_text(text: str) -> str:
    text = text.lower().strip()

    # Apply Hindi/Hinglish map (longest match first)
    for hindi, english in sorted(HINDI_MAP.items(), key=lambda x: -len(x[0])):
        text = text.replace(hindi, english)

    # Apply typo map
    for typo, correct in sorted(TYPO_MAP.items(), key=lambda x: -len(x[0])):
        text = re.sub(r'\b' + re.escape(typo) + r'\b', correct, text)

    # Remove non-alphanumeric except spaces
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()
