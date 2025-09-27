const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class KnowledgeBaseService {
  constructor() {
    this.knowledgeBasePath = path.join(__dirname, '../data/health_knowledge_base.json');
    this.knowledgeBase = null;
    this.loadKnowledgeBase();
  }

  // Load knowledge base from JSON file
  loadKnowledgeBase() {
    try {
      const data = fs.readFileSync(this.knowledgeBasePath, 'utf8');
      this.knowledgeBase = JSON.parse(data);
      logger.info('📚 Health knowledge base loaded successfully');
    } catch (error) {
      logger.error('Failed to load knowledge base:', error);
      this.knowledgeBase = { diseases: {}, emergency_contacts: {}, general_health_tips: {} };
    }
  }

  // Search for health information based on query
  async searchHealthInfo(query, language = 'en') {
    try {
      const lowerQuery = query.toLowerCase();
      
      logger.info(`🔍 Knowledge base searching for: "${query}"`);
      
      // First try direct symptom matching for common symptoms
      const directSymptomResponse = this.getDirectSymptomResponse(lowerQuery, language);
      if (directSymptomResponse) {
        logger.info('✅ Direct symptom match found');
        return directSymptomResponse;
      }

      // Search for specific diseases
      const diseaseInfo = this.searchDiseases(lowerQuery, language);
      if (diseaseInfo) {
        logger.info('✅ Disease match found');
        return diseaseInfo;
      }

      // Search for symptoms (with improved matching)
      const symptomInfo = this.searchBySymptoms(lowerQuery, language);
      if (symptomInfo) {
        logger.info('✅ Symptom match found');
        return symptomInfo;
      }

      // Search for general health topics
      const generalInfo = this.searchGeneralHealth(lowerQuery, language);
      if (generalInfo) {
        logger.info('✅ General health match found');
        return generalInfo;
      }

      // Search for emergency information
      const emergencyInfo = this.searchEmergencyInfo(lowerQuery, language);
      if (emergencyInfo) {
        logger.info('✅ Emergency info match found');
        return emergencyInfo;
      }

      return this.getDefaultResponse(language);

    } catch (error) {
      logger.error('Knowledge base search error:', error);
      return this.getDefaultResponse(language);
    }
  }

  // Get direct response for common symptoms
  getDirectSymptomResponse(query, language) {
    const commonSymptoms = {
      fever: {
        en: "For fever, rest and drink plenty of water. Take paracetamol 500mg every 6 hours if needed. Use cold compress on forehead. See doctor if temperature exceeds 103°F or persists for more than 3 days.",
        hi: "बुखार के लिए आराम करें और बहुत पानी पिएं। जरूरत पड़ने पर हर 6 घंटे में पैरासिटामोल 500mg लें। माथे पर ठंडी पट्टी रखें। यदि तापमान 103°F से अधिक हो या 3 दिन से अधिक रहे तो डॉक्टर से मिलें।",
        hinglish: "Fever ke liye aaram karo aur bahut paani piyo. Jarurat padne par har 6 ghante mein paracetamol 500mg lo. Mathe par thandi patti rakho. Agar temperature 103°F se zyada ho ya 3 din se zyada rahe to doctor se milo."
      },
      headache: {
        en: "For headache, rest in a quiet, dark room. Apply cold or warm compress on forehead. Take paracetamol or ibuprofen as directed. Stay hydrated. See doctor if severe or persistent.",
        hi: "सिरदर्द के लिए शांत, अंधेरे कमरे में आराम करें। माथे पर ठंडी या गर्म पट्टी लगाएं। निर्देशानुसार पैरासिटामोल या इबुप्रोफेन लें। हाइड्रेटेड रहें। यदि गंभीर या लगातार हो तो डॉक्टर से मिलें।",
        hinglish: "Headache ke liye shaant, andhera kamre mein aaram karo. Mathe par thandi ya garm patti lagao. Direction ke according paracetamol ya ibuprofen lo. Hydrated raho. Agar serious ya lagatar ho to doctor se milo."
      },
      cough: {
        en: "For cough, drink warm water with honey and lemon. Use steam inhalation. Avoid cold drinks and ice cream. Take cough syrup if needed. See doctor if blood in cough or persists for more than 2 weeks.",
        hi: "खांसी के लिए शहद और नींबू के साथ गर्म पानी पिएं। भाप का सेवन करें। ठंडे पेय और आइसक्रीम से बचें। जरूरत पड़ने पर खांसी की सिरप लें। यदि खांसी में खून या 2 सप्ताह से अधिक हो तो डॉक्टर से मिलें।",
        hinglish: "Cough ke liye honey aur lemon ke saath garm paani piyo. Steam inhalation karo. Thande drinks aur ice cream se bacho. Jarurat padne par cough syrup lo. Agar cough mein blood ho ya 2 hafta se zyada ho to doctor se milo."
      }
    };

    // Check for direct symptom matches
    for (const [symptom, responses] of Object.entries(commonSymptoms)) {
      const symptomKeywords = [symptom, symptom + 's', 'i have ' + symptom, symptom + ' problem'];
      
      if (symptomKeywords.some(keyword => query.includes(keyword))) {
        return responses[language] || responses['en'];
      }
    }

    // Check for Hindi/Hinglish variants
    const hindiSymptoms = {
      'bukhar': 'fever',
      'garmi': 'fever', 
      'temperature': 'fever',
      'sir dard': 'headache',
      'sar dard': 'headache',
      'headache': 'headache',
      'khansi': 'cough',
      'khasi': 'cough'
    };

    for (const [hindiWord, englishSymptom] of Object.entries(hindiSymptoms)) {
      if (query.includes(hindiWord) && commonSymptoms[englishSymptom]) {
        return commonSymptoms[englishSymptom][language] || commonSymptoms[englishSymptom]['en'];
      }
    }

    return null;
  }

  // Search for specific diseases
  searchDiseases(query, language) {
    const diseases = this.knowledgeBase.diseases;
    
    for (const [diseaseKey, diseaseData] of Object.entries(diseases)) {
      const diseaseInfo = diseaseData[language] || diseaseData['en'];
      
      // Check if query matches disease name or key
      if (
        diseaseKey.includes(query) ||
        diseaseInfo.name.toLowerCase().includes(query) ||
        this.checkKeywordMatch(query, [diseaseKey, diseaseInfo.name.toLowerCase()])
      ) {
        return this.formatDiseaseInfo(diseaseInfo, language);
      }
    }

    return null;
  }

  // Search by symptoms
  searchBySymptoms(query, language) {
    const diseases = this.knowledgeBase.diseases;
    const matchedDiseases = [];

    for (const [diseaseKey, diseaseData] of Object.entries(diseases)) {
      const diseaseInfo = diseaseData[language] || diseaseData['en'];
      
      // Check if query matches any symptoms
      const symptomMatch = diseaseInfo.symptoms.some(symptom => 
        symptom.toLowerCase().includes(query) || 
        this.checkSymptomKeywords(query, symptom.toLowerCase())
      );

      if (symptomMatch) {
        matchedDiseases.push({ key: diseaseKey, info: diseaseInfo });
      }
    }

    if (matchedDiseases.length > 0) {
      // Return the most relevant match or multiple matches
      if (matchedDiseases.length === 1) {
        return this.formatDiseaseInfo(matchedDiseases[0].info, language);
      } else {
        return this.formatMultipleDiseaseMatches(matchedDiseases, language);
      }
    }

    return null;
  }

  // Search general health information
  searchGeneralHealth(query, language) {
    const healthKeywords = {
      exercise: ['exercise', 'workout', 'physical activity', 'vyayam', 'kasrat'],
      diet: ['diet', 'food', 'nutrition', 'eating', 'khana', 'bhojan', 'aahar'],
      sleep: ['sleep', 'rest', 'neend', 'aaram'],
      water: ['water', 'hydration', 'paani', 'jal'],
      stress: ['stress', 'tension', 'worry', 'chinta', 'pareshani']
    };

    for (const [topic, keywords] of Object.entries(healthKeywords)) {
      if (keywords.some(keyword => query.includes(keyword))) {
        return this.getGeneralHealthAdvice(topic, language);
      }
    }

    return null;
  }

  // Search emergency information
  searchEmergencyInfo(query, language) {
    const emergencyKeywords = [
      'emergency', 'urgent', 'help', 'ambulance', 'hospital',
      'emergency', 'apatkal', 'madad', 'ambulance', 'aspatal'
    ];

    if (emergencyKeywords.some(keyword => query.includes(keyword))) {
      return this.getEmergencyContacts(language);
    }

    return null;
  }

  // Check for keyword matches
  checkKeywordMatch(query, keywords) {
    const queryWords = query.split(' ');
    return keywords.some(keyword => 
      queryWords.some(word => keyword.includes(word) || word.includes(keyword))
    );
  }

  // Check symptom keywords
  checkSymptomKeywords(query, symptom) {
    const symptomKeywords = {
      pain: ['pain', 'hurt', 'ache', 'dard', 'takleef'],
      fever: ['fever', 'temperature', 'bukhar', 'garmi'],
      headache: ['headache', 'head pain', 'sir dard', 'sar dard'],
      cough: ['cough', 'khansi', 'khasi'],
      breath: ['breath', 'breathing', 'saans', 'sansh']
    };

    for (const [symptomType, keywords] of Object.entries(symptomKeywords)) {
      if (keywords.some(keyword => query.includes(keyword) || symptom.includes(keyword))) {
        return true;
      }
    }

    return false;
  }

  // Format disease information
  formatDiseaseInfo(diseaseInfo, language) {
    const sections = [];

    sections.push(`📋 **${diseaseInfo.name}**\n`);
    sections.push(`${diseaseInfo.definition}\n`);

    if (diseaseInfo.types) {
      sections.push(`**प्रकार / Types:**`);
      diseaseInfo.types.forEach(type => sections.push(`• ${type}`));
      sections.push('');
    }

    sections.push(`**लक्षण / Symptoms:**`);
    diseaseInfo.symptoms.forEach(symptom => sections.push(`• ${symptom}`));
    sections.push('');

    if (diseaseInfo.causes) {
      sections.push(`**कारण / Causes:**`);
      diseaseInfo.causes.forEach(cause => sections.push(`• ${cause}`));
      sections.push('');
    }

    sections.push(`**प्रबंधन / Management:**`);
    diseaseInfo.management.forEach(mgmt => sections.push(`• ${mgmt}`));
    sections.push('');

    sections.push(`**रोकथाम / Prevention:**`);
    diseaseInfo.prevention.forEach(prev => sections.push(`• ${prev}`));
    sections.push('');

    if (diseaseInfo.emergency_signs) {
      sections.push(`🚨 **आपातकालीन संकेत / Emergency Signs:**`);
      diseaseInfo.emergency_signs.forEach(sign => sections.push(`⚠️ ${sign}`));
      sections.push('');
    }

    if (diseaseInfo.home_remedies) {
      sections.push(`🏠 **घरेलू उपाय / Home Remedies:**`);
      diseaseInfo.home_remedies.forEach(remedy => sections.push(`• ${remedy}`));
      sections.push('');
    }

    const disclaimer = this.getDisclaimer(language);
    sections.push(disclaimer);

    return sections.join('\n');
  }

  // Format multiple disease matches
  formatMultipleDiseaseMatches(matches, language) {
    const sections = [];
    
    const title = language === 'hi' ? 
      '🔍 **आपके लक्षण निम्नलिखित स्थितियों से संबंधित हो सकते हैं:**' :
      language === 'hinglish' ?
      '🔍 **Aapke symptoms ye conditions se related ho sakte hain:**' :
      '🔍 **Your symptoms may be related to the following conditions:**';
    
    sections.push(title);
    sections.push('');

    matches.forEach((match, index) => {
      sections.push(`${index + 1}. **${match.info.name}**`);
      sections.push(`   ${match.info.definition}`);
      sections.push('');
    });

    const advice = language === 'hi' ?
      '💡 **सुझाव:** सटीक निदान के लिए कृपया डॉक्टर से मिलें और अपने सभी लक्षणों के बारे में बताएं।' :
      language === 'hinglish' ?
      '💡 **Suggestion:** Accurate diagnosis ke liye doctor se miliye aur apne saare symptoms ke baare mein bataiye.' :
      '💡 **Suggestion:** Please consult a doctor for accurate diagnosis and discuss all your symptoms.';

    sections.push(advice);
    sections.push('');
    sections.push(this.getDisclaimer(language));

    return sections.join('\n');
  }

  // Get general health advice
  getGeneralHealthAdvice(topic, language) {
    const advice = {
      exercise: {
        en: '🏃‍♂️ **Exercise Guidelines:**\n\n• Aim for 150 minutes of moderate exercise weekly\n• Include both cardio and strength training\n• Start slowly and gradually increase intensity\n• Walking, cycling, swimming are excellent options\n• Exercise with friends for motivation\n\n💡 **Tip:** Even 10-15 minutes of daily activity can make a difference!',
        hi: '🏃‍♂️ **व्यायाम दिशानिर्देश:**\n\n• साप्ताहिक 150 मिनट मध्यम व्यायाम का लक्ष्य रखें\n• कार्डियो और शक्ति प्रशिक्षण दोनों शामिल करें\n• धीरे-धीरे शुरू करें और धीरे-धीरे तीव्रता बढ़ाएं\n• चलना, साइकिल चलाना, तैरना उत्कृष्ट विकल्प हैं\n• प्रेरणा के लिए दोस्तों के साथ व्यायाम करें\n\n💡 **सुझाव:** दैनिक 10-15 मिनट की गतिविधि भी फर्क ला सकती है!',
        hinglish: '🏃‍♂️ **Exercise Guidelines:**\n\n• Weekly 150 minutes moderate exercise ka target rakhiye\n• Cardio aur strength training dono include kariye\n• Slowly start kariye aur gradually intensity badhaye\n• Walking, cycling, swimming excellent options hain\n• Motivation ke liye friends ke saath exercise kariye\n\n💡 **Tip:** Daily 10-15 minutes ki activity bhi difference la sakti hai!'
      },
      diet: {
        en: '🥗 **Healthy Diet Guidelines:**\n\n• Eat 5 servings of fruits and vegetables daily\n• Choose whole grains over refined grains\n• Include lean proteins (fish, chicken, legumes)\n• Limit processed and sugary foods\n• Stay hydrated with 8-10 glasses of water\n• Practice portion control\n\n💡 **Tip:** Plan your meals in advance for better nutrition!',
        hi: '🥗 **स्वस्थ आहार दिशानिर्देश:**\n\n• प्रतिदिन फल और सब्जियों के 5 हिस्से खाएं\n• परिष्कृत अनाज के बजाय साबुत अनाज चुनें\n• दुबले प्रोटीन शामिल करें (मछली, चिकन, दालें)\n• प्रसंस्कृत और मीठे खाद्य पदार्थों को सीमित करें\n• 8-10 गिलास पानी पीकर हाइड्रेटेड रहें\n• भाग नियंत्रण का अभ्यास करें\n\n💡 **सुझाव:** बेहतर पोषण के लिए अपने भोजन की पहले से योजना बनाएं!',
        hinglish: '🥗 **Healthy Diet Guidelines:**\n\n• Daily fruits aur vegetables ke 5 servings khaye\n• Refined grains ke bajaye whole grains choose kariye\n• Lean proteins include kariye (fish, chicken, dal)\n• Processed aur sugary foods limit kariye\n• 8-10 glass paani peeke hydrated rahe\n• Portion control practice kariye\n\n💡 **Tip:** Better nutrition ke liye apne meals advance mein plan kariye!'
      }
    };

    return advice[topic]?.[language] || advice[topic]?.['en'] || this.getDefaultResponse(language);
  }

  // Get emergency contacts
  getEmergencyContacts(language) {
    const contacts = this.knowledgeBase.emergency_contacts?.india || [];
    
    const title = language === 'hi' ?
      '🚨 **आपातकालीन संपर्क नंबर (भारत):**' :
      language === 'hinglish' ?
      '🚨 **Emergency Contact Numbers (India):**' :
      '🚨 **Emergency Contact Numbers (India):**';

    const sections = [title, ''];
    contacts.forEach(contact => sections.push(`📞 ${contact}`));
    
    const urgentAdvice = language === 'hi' ?
      '\n⚠️ **तत्काल चिकित्सा आपातकाल में 112 डायल करें**' :
      language === 'hinglish' ?
      '\n⚠️ **Medical emergency mein turant 112 dial kariye**' :
      '\n⚠️ **For immediate medical emergency, dial 112**';

    sections.push(urgentAdvice);
    
    return sections.join('\n');
  }

  // Get disclaimer
  getDisclaimer(language) {
    const disclaimers = {
      en: '\n⚠️ **DISCLAIMER:** This information is for educational purposes only. Always consult a qualified healthcare professional for medical advice, diagnosis, or treatment.',
      hi: '\n⚠️ **चेतावनी:** यह जानकारी केवल शैक्षिक उद्देश्यों के लिए है। चिकित्सा सलाह, निदान या उपचार के लिए हमेशा योग्य स्वास्थ्य पेशेवर से सलाह लें।',
      hinglish: '\n⚠️ **DISCLAIMER:** Ye information sirf educational purpose ke liye hai. Medical advice, diagnosis ya treatment ke liye hamesha qualified healthcare professional se consult kariye.'
    };

    return disclaimers[language] || disclaimers.en;
  }

  // Get default response
  getDefaultResponse(language) {
    const responses = {
      en: 'I understand you have a health concern. While I have information about common health conditions, I recommend consulting with a healthcare professional for personalized advice. You can also ask me about specific diseases, symptoms, or general health topics. 🏥',
      hi: 'मैं समझता हूं कि आपकी स्वास्थ्य संबंधी चिंता है। जबकि मेरे पास सामान्य स्वास्थ्य स्थितियों की जानकारी है, मैं व्यक्तिगत सलाह के लिए स्वास्थ्य पेशेवर से परामर्श की सलाह देता हूं। आप मुझसे विशिष्ट बीमारियों, लक्षणों या सामान्य स्वास्थ्य विषयों के बारे में भी पूछ सकते हैं। 🏥',
      hinglish: 'Main samajh sakta hun ki aapki health concern hai. Mere paas common health conditions ki information hai, lekin personalized advice ke liye healthcare professional se consult karne ki recommend karta hun. Aap mujhse specific diseases, symptoms ya general health topics ke baare mein bhi pooch sakte hain. 🏥'
    };

    return responses[language] || responses.en;
  }

  // Get health information for specific condition
  async getHealthInfo(condition, language = 'en') {
    const diseases = this.knowledgeBase.diseases;
    const diseaseData = diseases[condition.toLowerCase()];
    
    if (diseaseData) {
      const diseaseInfo = diseaseData[language] || diseaseData['en'];
      return this.formatDiseaseInfo(diseaseInfo, language);
    }

    return null;
  }

  // Check if knowledge base is available
  isAvailable() {
    return this.knowledgeBase && Object.keys(this.knowledgeBase.diseases).length > 0;
  }

  // Get all available conditions
  getAvailableConditions() {
    return Object.keys(this.knowledgeBase.diseases || {});
  }
}

module.exports = new KnowledgeBaseService();