import os
import base64
from typing import Optional

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
MODEL_NAME = "models/gemini-1.5-flash"

CROP_SYSTEM_PROMPT = """You are AgroShield AI, an expert agricultural assistant for small to medium-scale farmers. 
Your knowledge covers:
- Crop disease diagnosis and treatment (tomato, wheat, potato, grapes, rice, maize, cotton)
- Pest identification and biological/organic/chemical control
- Weather impact on crops and disease prediction
- Optimal spraying windows and best practices
- Soil health and nutrient management
- Integrated Pest Management (IPM) strategies
- Sustainable and organic farming practices

Always provide practical, actionable advice. Consider the farmer's local conditions.
Support responses in English, Hindi, Spanish, French, and simple agricultural language.
Be concise but thorough. When suggesting chemicals, provide proper dosage and safety precautions."""

LANGUAGE_HINTS = {
    "en": "Respond in English. Use simple, clear agricultural terms.",
    "hi": "Respond in Hindi (हिंदी). Use clear Devanagari script and simple agricultural Hindi.",
    "bn": "Respond in Bengali (বাংলা). Use clear Bengali script and simple agricultural terms.",
    "mr": "Respond in Marathi (मराठी). Use clear Marathi Devanagari script and simple agricultural terms.",
    "te": "Respond in Telugu (తెలుగు). Use clear Telugu script and simple agricultural terms.",
    "ta": "Respond in Tamil (தமிழ்). Use clear Tamil script and simple agricultural terms.",
    "gu": "Respond in Gujarati (ગુજરાતી). Use clear Gujarati script and simple agricultural terms.",
    "kn": "Respond in Kannada (ಕನ್ನಡ). Use clear Kannada script and simple agricultural terms.",
    "ml": "Respond in Malayalam (മലയാളം). Use clear Malayalam script and simple agricultural terms.",
    "pa": "Respond in Punjabi (ਪੰਜਾਬੀ). Use clear Gurmukhi script and simple agricultural terms.",
    "or": "Respond in Odia (ଓଡ଼ିଆ). Use clear Odia script and simple agricultural terms.",
    "as": "Respond in Assamese (অসমীয়া). Use clear Assamese script and simple agricultural terms.",
    "ur": "Respond in Urdu (اردو). Use clear Urdu script and simple agricultural terms.",
    "es": "Respond in Spanish (Español). Use simple agricultural Spanish.",
    "fr": "Respond in French (Français). Use simple agricultural French.",
}

def get_gemini_response(message: str, language: str = "en", context: Optional[dict] = None) -> str:
    if not GEMINI_API_KEY:
        return _mock_chat_response(message, language, context)

    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel(MODEL_NAME)

        lang_hint = LANGUAGE_HINTS.get(language, LANGUAGE_HINTS["en"])
        context_str = ""
        if context:
            farm_info = context.get("farm", {})
            weather_info = context.get("weather", [])
            context_str = f"\nFarm Context: Crop={farm_info.get('crop_type', 'unknown')}, Location=({farm_info.get('latitude', '?')}, {farm_info.get('longitude', '?')})"
            if weather_info:
                context_str += f"\nCurrent Weather: {weather_info[0].get('condition', 'N/A')}, Temp={weather_info[0].get('avg_temp', '?')}°C, Humidity={weather_info[0].get('humidity', '?')}%"

        prompt = f"{CROP_SYSTEM_PROMPT}\nIMPORTANT LANGUAGE REQUIREMENT: {lang_hint}\n{context_str}\n\nFarmer's Question: {message}"
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return _mock_chat_response(message, language, context)

def diagnose_pest_image(image_data: bytes, filename: str, language: str = "en") -> dict:
    if not GEMINI_API_KEY:
        return _mock_pest_diagnosis()

    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel(MODEL_NAME)

        image_b64 = base64.b64encode(image_data).decode("utf-8")
        mime_type = "image/jpeg"
        if filename.lower().endswith(".png"):
            mime_type = "image/png"
        elif filename.lower().endswith((".webp", ".gif")):
            mime_type = f"image/{filename.rsplit('.', 1)[-1].lower()}"

        lang_hint = LANGUAGE_HINTS.get(language, LANGUAGE_HINTS["en"])
        prompt = f"""{CROP_SYSTEM_PROMPT}

Analyze this agricultural image and provide:
1. **Detected Issue**: What pest, disease, or nutrient deficiency is visible?
2. **Confidence Level**: High/Medium/Low
3. **Severity**: Mild/Moderate/Severe
4. **Organic Treatments**: Natural remedies and biological controls
5. **Chemical Controls**: Recommended pesticides/fungicides with dosage
6. **Prevention Tips**: How to prevent future occurrences
7. **Immediate Actions**: What the farmer should do now

Language Instructions: {lang_hint}
Format the response as a structured JSON object with these fields: detected_issue, confidence, severity, organic_treatments, chemical_controls, prevention_tips, immediate_actions."""

        response = model.generate_content([
            {"mime_type": mime_type, "data": image_b64},
            prompt
        ])

        raw = response.text
        import re, json as json_lib
        json_match = re.search(r'\{.*\}', raw, re.DOTALL)
        if json_match:
            return json_lib.loads(json_match.group())
        return {"detected_issue": raw, "confidence": "Medium", "severity": "Unknown",
                "organic_treatments": "N/A", "chemical_controls": "N/A",
                "prevention_tips": "N/A", "immediate_actions": "Consult local agricultural extension officer."}
    except Exception as e:
        return _mock_pest_diagnosis()

def _mock_chat_response(message: str, language: str = "en", context: Optional[dict] = None) -> str:
    message_lower = message.lower()
    crop = context.get("farm", {}).get("crop_type", "crops") if context else "crops"

    # Localized greetings for Indian & international languages
    greetings = {
        "hi": f"नमस्ते! 🙏 AgroShield AI किसान सहायक में आपका स्वागत है। आपकी {crop} फसल और मौसम के बारे में प्रश्न पूछें।\n\n- **कीट व रोग नियंत्रण**\n- **मौसम एडवाइजरी**\n- **छिड़काव (Spray) का सही समय**",
        "bn": f"নমস্কার! 🙏 AgroShield AI কৃষক সহায়কে আপনাকে স্বাগতম। আপনার {crop} ফসল এবং আবহাওয়া সম্পর্কিত যেকোনো প্রশ্ন জিজ্ঞাসা করুন।",
        "mr": f"नमस्कार! 🙏 AgroShield AI शेतकरी सहाय्यकामध्ये आपले स्वागत आहे. आपल्या {crop} पिकाबद्दल आणि हवामानाबद्दल प्रश्न विचारा.",
        "te": f"నమస్కారం! 🙏 AgroShield AI రైతు సహాయకునికి స్వాగతం. మీ {crop} పంట మరియు వాతావరణ వివరాల గురించి ఏవైనా ప్రశ్నలు అడగండి.",
        "ta": f"வணக்கம்! 🙏 AgroShield AI விவசாய உதவியாளருக்கு வரவேற்கிறோம். உங்கள் {crop} பயிர் மற்றும் வானிலை பற்றிய கேள்விகளைக் கேட்கலாம்.",
        "gu": f"નમસ્તે! 🙏 AgroShield AI ખેડૂત સહાયકમાં તમારું સ્વાગત છે. તમારા {crop} પાક અને હવામાન અંગે પ્રશ્નો પૂછો.",
        "kn": f"ನಮಸ್ಕಾರ! 🙏 AgroShield AI ರೈತ ಸಹಾಯಕಕ್ಕೆ ಸ್ವಾಗತ. ನಿಮ್ಮ {crop} ಬೆಳೆ ಮತ್ತು ಹವಾಮಾನದ ಬಗ್ಗೆ ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳಿ.",
        "ml": f"നമസ്കാരം! 🙏 AgroShield AI കർഷക സഹായിയിലേക്ക് സ്വാഗതം. നിങ്ങളുടെ {crop} വിളയെക്കുറിച്ചും കാലാവസ്ഥയെക്കുറിച്ചും സംശയങ്ങൾ ചോദിക്കാം.",
        "pa": f"ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ! 🙏 AgroShield AI ਕਿਸਾਨ ਸਹਾਇਕ ਵਿੱਚ ਤੁਹਾਡਾ ਸੁਆਗਤ ਹੈ। ਆਪਣੀ {crop} ਫਸਲ ਅਤੇ ਮੌਸਮ ਬਾਰੇ ਸਵਾਲ ਪੁੱਛੋ।",
        "or": f"ନମସ୍କାର! 🙏 AgroShield AI କୃଷକ ସହାୟକକୁ ସ୍ଵାଗତ। ଆପଣଙ୍କ {crop} ଫସଲ ଏବଂ ପାଣିପାଗ ବିଷୟରେ ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ।",
        "as": f"নমস্কাৰ! 🙏 AgroShield AI কৃষক সহায়কলৈ স্বাগতম। আপোনাৰ {crop} খেতি আৰু বতৰ সম্পৰ্কে প্ৰশ্ন সোধক।",
        "ur": f"السلام علیکم! 🙏 AgroShield AI کسان اسسٹنٹ میں خوش آمدید۔ اپنی {crop} فصل اور موسم کے بارے میں سوالات پوچھیں۔",
        "es": f"¡Hola! AgroShield AI asistente agrícola. Pregunte sobre su cultivo de {crop} y recomendaciones.",
        "fr": f"Bonjour! AgroShield AI assistant agricole. Posez vos questions sur vos cultures de {crop}.",
    }

    if "hello" in message_lower or "namaste" in message_lower or "hi" in message_lower or "नमस्ते" in message_lower or "নমস্কার" in message_lower or "வணக்கம்" in message_lower:
        return greetings.get(language, f"Namaste! 🙏 I'm AgroShield AI, your farming assistant for {crop}. Ask me anything about crop diseases, weather predictions, or spray windows.")

    if "blight" in message_lower or "late blight" in message_lower or "बीमारी" in message_lower or "रोग" in message_lower:
        if language == "hi":
            return ("आपकी फसल में पछेता झुलसा (Late Blight) का खतरा हो सकता है।\n\n"
                    "**सुझाव:**\n"
                    "1. तुरंत कॉपर बेस्ड फफूंदनाशी (Copper Oxychloride 2g/L) का छिड़काव करें।\n"
                    "2. संक्रमित पत्तियों को हटा दें।\n"
                    "3. शाम के समय या तेज हवा में छिड़काव न करें।")
        elif language == "te":
            return ("మీ పంటలో తెగులు (Blight) వచ్చే అవకాశం ఉంది.\n\n"
                    "**సిఫార్సులు:**\n"
                    "1. కాపర్ ఆక్సీక్లోరైడ్ 2g/L పిచికారీ చేయండి.\n"
                    "2. వ్యాధి సోకిన ఆకులను తొలగించండి.")
        elif language == "ta":
            return ("உங்கள் பயிரில் நோய் தாக்குதல் அபாயம் உள்ளது.\n\n"
                    "**பரிந்துரைகள்:**\n"
                    "1. காப்பர் ஆக்ஸிகுளோரைடு 2g/L தெளிக்கவும்.\n"
                    "2. பாதிக்கப்பட்ட இலைகளை அகற்றவும்.")

    if "spray" in message_lower or "bt" in message_lower or "छिड़काव" in message_lower:
        if language == "hi":
            return ("बेंचमार्क मौसम अपडेट:\n\n"
                    "✅ **छिड़काव स्थिति:** उत्तम\n"
                    "- हवा की गति: 8 किमी/घंटा (सुरक्षित)\n"
                    "- बारिश की संभावना: 15%\n\n"
                    "**उत्तम समय:** कल सुबह 6:00 से 8:00 बजे के बीच।")

    return (f"Thank you for your inquiry regarding your {crop} field.\n\n"
            f"**Recommended Steps:**\n"
            f"1. Monitor soil moisture and leaf health daily.\n"
            f"2. Check the Spray Planner before applying fungicides/pesticides.\n"
            f"3. Upload a photo in Pest Diagnosis for instant visual diagnosis.\n\n"
            f"*(Selected Language: {language.upper()})*")

def _mock_pest_diagnosis() -> dict:
    return {
        "detected_issue": "Possible Early Blight (Alternaria solani)",
        "confidence": "Medium",
        "severity": "Moderate",
        "organic_treatments": "Neem oil spray (5mL/L) weekly. Compost tea application. Baking soda solution (1 tsp/L) with insecticidal soap.",
        "chemical_controls": "Apply Chlorothalonil (2g/L) or Mancozeb (2g/L) at 7-day intervals. Rotate with Azoxystrobin for resistance management.",
        "prevention_tips": "Practice crop rotation with non-Solanaceous crops. Ensure proper plant spacing for air circulation. Avoid overhead irrigation. Use disease-free seeds and transplants.",
        "immediate_actions": "Remove and destroy affected leaves. Apply fungicide treatment today. Monitor spread in next 48 hours."
    }

