# 🏥 WhatsApp Health Assistant Chatbot

[![Deploy to Azure](https://img.shields.io/badge/Deploy%20to-Azure-0078d4?style=for-the-badge&logo=microsoft-azure)](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fankittroy-21%2Fwhatsa## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/ankittroy-21/whatsapp-health-assistant/issues)
- 📖 **Documentation**: [Project Wiki](https://github.com/ankittroy-21/whatsapp-health-assistant/wiki)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/ankittroy-21/whatsapp-health-assistant/discussions)

---

<div align="center">

**🇮🇳 Made with ❤️ for accessible healthcare in rural India**

*Empowering communities with instant access to health information in their preferred language*

[![GitHub Stars](https://img.shields.io/github/stars/ankittroy-21/whatsapp-health-assistant?style=social)](https://github.com/ankittroy-21/whatsapp-health-assistant)
[![GitHub Forks](https://img.shields.io/github/forks/ankittroy-21/whatsapp-health-assistant?style=social)](https://github.com/ankittroy-21/whatsapp-health-assistant)

</div>t%2Fmain%2Fazure-deploy.json)
[![Deploy to Render](https://img.shields.io/badge/Deploy%20to-Render-46e3b7?style=for-the-badge&logo=render)](https://render.com/deploy?repo=https://github.com/ankittroy-21/whatsapp-health-assistant)
[![Deploy to Railway](https://img.shields.io/badge/Deploy%20to-Railway-0B0D0E?style=for-the-badge&logo=railway)](https://railway.app/template/M4Kqvf?referralCode=ankittroy)
[![Deploy to Vercel](https://img.shields.io/badge/Deploy%20to-Vercel-000000?style=for-the-badge&logo=vercel)](https://vercel.com/new/clone?repository-url=https://github.com/ankittroy-21/whatsapp-health-assistant)

> 🇮🇳 **AI-Powered Health Assistant for Rural India** - Multilingual WhatsApp chatbot providing instant health guidance in English, Hindi, and Hinglish with voice support and emergency detection.

![Health Assistant Demo](https://img.shields.io/badge/Status-Production%20Ready-success?style=flat-square)

<div align="center">

**🇮🇳 Made with ❤️ for accessible healthcare in rural India**

*Empowering communities with instant access to health information in their preferred language*

[![GitHub Stars](https://img.shields.io/github/stars/ankittroy-21/whatsapp-health-assistant?style=social)](https://github.com/ankittroy-21/whatsapp-health-assistant)
[![GitHub Forks](https://img.shields.io/github/forks/ankittroy-21/whatsapp-health-assistant?style=social)](https://github.com/ankittroy-21/whatsapp-health-assistant)

</div>pp-health-assistant%2Fmain%2Fazure-deploy.json)
[![Deploy to Render](https://img.shields.io/badge/Deploy%20to-Render-46e3b7?style=for-the-badge&logo=render)](https://render.com/deploy?repo=https://github.com/ankittroy-21/whatsapp-health-assistant)
[![Deploy to Railway](https://img.shields.io/badge/Deploy%20to-Railway-0B0D0E?style=for-the-badge&logo=railway)](https://railway.app/template/M4Kqvf?referralCode=ankittroy)
[![Deploy to Vercel](https://img.shields.io/badge/Deploy%20to-Vercel-000000?style=for-the-badge&logo=vercel)](https://vercel.com/new/clone?repository-url=https://github.com/ankittroy-21/whatsapp-health-assistant)

> 🇮🇳 **AI-Powered Health Assistant for Rural India** - Multilingual WhatsApp chatbot providing instant health guidance in English, Hindi, and Hinglish with voice support and emergency detection.

![Health Assistant Demo](https://img.shields.io/badge/Status-Production%20Ready-success?style=flat-square)
![Multilingual Support](https://img.shields.io/badge/Languages-English%20%7C%20Hindi%20%7C%20Hinglish-blue?style=flat-square)
![Voice Enabled](https://img.shields.io/badge/Voice-Enabled-orange?style=flat-square)
![Emergency Detection](https://img.shields.io/badge/Emergency-Detection-red?style=flat-square)

## 🌟 Features

✅ **WhatsApp Integration** - Complete webhook handling for text & voice messages  
✅ **Multilingual Support** - English, Hindi, Hinglish with automatic detection  
✅ **Voice Capabilities** - Speech-to-text and text-to-speech processing  
✅ **AI Integration** - Google Gemini (primary), Hugging Face & OpenAI (fallback)  
✅ **Health Knowledge Base** - Comprehensive offline medical database  
✅ **Context Awareness** - Conversation history and user context storage  
✅ **Emergency Detection** - Automatic emergency response protocols  
✅ **Security Features** - Rate limiting, input validation, webhook verification  
✅ **Analytics & Logging** - Complete conversation tracking and analytics  
✅ **Automatic Setup** - Database and services auto-configured on deployment  

## 🚀 Quick Deploy (5 Minutes)

### 1️⃣ One-Click Deployment
Choose your preferred platform and click deploy:

**Azure (Recommended for Production)**
[![Deploy to Azure](https://aka.ms/deploytoazurebutton)](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fankittroy-21%2Fwhatsapp-health-assistant%2Fmain%2Fazure-deploy.json)

**Render (Easiest Setup)**
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/ankittroy-21/whatsapp-health-assistant)

**Railway (Developer Friendly)**
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/M4Kqvf?referralCode=ankittroy)

**Vercel (Serverless)**
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ankittroy-21/whatsapp-health-assistant)

### 2️⃣ Configure Environment Variables
After deployment, add these environment variables in your platform's dashboard:

#### Required (Minimum Setup)
| Variable | Get From | Example |
|----------|----------|---------|
| `SUPABASE_URL` | [supabase.com](https://supabase.com) → New Project → Settings → API | `https://xyz.supabase.co` |
| `SUPABASE_KEY` | Supabase → Settings → API → anon public key | `eyJhbGciOiJIUzI1NiIs...` |
| `TWILIO_ACCOUNT_SID` | [twilio.com](https://twilio.com) → Console → Account SID | `ACxxxxxxxxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | Twilio → Console → Auth Token | `xxxxxxxxxxxxxxx` |
| `TWILIO_PHONE_NUMBER` | Twilio → WhatsApp → Your number | `whatsapp:+14155552671` |
| `GEMINI_API_KEY` | [ai.google.dev](https://ai.google.dev) → Get API Key | `AIxxxxxxxxxxxxxxx` |
| `APP_URL` | Your deployed app URL (for Render free tier) | `https://your-app.onrender.com` |

#### Optional (Enhanced Features)
| Variable | Purpose | Get From |
|----------|---------|----------|
| `HUGGINGFACE_API_TOKEN` | AI fallback | [huggingface.co](https://huggingface.co) → Settings → Access Tokens |
| `OPENAI_API_KEY` | Additional AI | [platform.openai.com](https://platform.openai.com) → API Keys |
| `AZURE_SPEECH_KEY` | Voice processing | [portal.azure.com](https://portal.azure.com) → Speech Services |
| `AZURE_SPEECH_REGION` | Voice region | Azure → Speech Services → Region |

> **🔄 Render Free Tier Users**: The `APP_URL` enables automatic keep-alive to prevent your app from spinning down. See the Keep-Alive Service section below for details.

### 3️⃣ Configure WhatsApp Webhook
1. Go to [Twilio Console](https://console.twilio.com) → Messaging → WhatsApp
2. Set webhook URL to: `https://your-app-url.com/webhook/whatsapp`
3. Set HTTP method to: `POST`
4. Save configuration

### 4️⃣ Test Your Bot
Send a WhatsApp message to your Twilio number:
- **"Hi"** - Basic greeting
- **"I have fever"** - Health query in English  
- **"मुझे बुखार है"** - Health query in Hindi
- **Voice message** - Test voice processing
- **"Emergency! Chest pain"** - Test emergency detection

## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- Git

### Setup
```bash
# Clone repository
git clone https://github.com/ankittroy-21/whatsapp-health-assistant.git
cd whatsapp-health-assistant

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start development server
npm run dev
```

### Docker Development
```bash
# Start with Docker
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# View logs
docker-compose logs -f app
```

## � API Key Setup Guide

### 1. Supabase (Database)
1. Go to [supabase.com](https://supabase.com) → "New project"
2. Wait for setup completion (~5 minutes)
3. Go to Settings → API
4. Copy "Project URL" and "anon public" key
5. **Database auto-configures on first run - no manual setup needed!**

### 2. Twilio (WhatsApp)
1. Sign up at [twilio.com](https://twilio.com)
2. Go to Console → Account → Keys & Credentials
3. Copy Account SID and Auth Token
4. Set up WhatsApp Business → Get your WhatsApp number
5. Configure webhook (see step 3 above)

### 3. Google Gemini (AI)
1. Go to [ai.google.dev](https://ai.google.dev)
2. Click "Get API key in Google AI Studio"
3. Create new project and generate API key
4. Copy the API key

### 4. Optional Services
- **Hugging Face**: [huggingface.co](https://huggingface.co) → Settings → Access Tokens
- **OpenAI**: [platform.openai.com](https://platform.openai.com) → API Keys
- **Azure Speech**: [portal.azure.com](https://portal.azure.com) → Create Speech Services

## � Features Overview

### 🤖 AI Integration
- **Google Gemini**: Primary AI for health responses
- **Hugging Face**: Fallback AI when Gemini unavailable
- **OpenAI**: Secondary fallback for complex queries
- **Offline Knowledge**: Local health database for emergencies

### 🗣️ Voice Processing
- **Speech-to-Text**: Understands voice messages
- **Text-to-Speech**: Responds with voice messages
- **Multi-Provider**: Google Cloud & Azure Speech support

### 🌐 Multilingual Support
- **English**: Full medical terminology
- **Hindi**: Native script with cultural context
- **Hinglish**: Mixed Hindi-English understanding
- **Auto-Detection**: Automatically identifies language

### 🚨 Emergency Detection
- **Keyword Matching**: Detects emergency situations
- **Instant Response**: Immediate emergency protocols
- **Local Contacts**: Indian emergency service numbers
- **Critical Care**: Guidance for serious conditions

### � Analytics & Monitoring
- **Conversation Tracking**: All interactions logged
- **User Analytics**: Usage patterns and preferences
- **Health Insights**: Popular queries and trends
- **Performance Metrics**: Response times and success rates

## 🔒 Security & Privacy

- **Rate Limiting**: Prevents spam and abuse
- **Input Validation**: Sanitizes all user inputs
- **Webhook Verification**: Validates Twilio signatures
- **Data Privacy**: No sensitive health data stored
- **CORS Protection**: Secure API access
- **Error Handling**: Graceful failure management

## 🔄 Keep-Alive Service (Render Free Tier)

### Auto-Prevention of App Sleep
Your WhatsApp Health Assistant includes an intelligent keep-alive service that prevents Render's free tier from spinning down your app after 15 minutes of inactivity.

#### ✨ Features
- **🤖 Automatic**: Only runs in production environment
- **⏰ Smart Timing**: Pings every 14 minutes (before timeout)
- **🏥 Health Checks**: Uses `/health` endpoint for pings
- **🛡️ Error Handling**: Graceful failure handling with logging
- **🎛️ Manual Control**: Test and monitor through API endpoints

#### 🚀 Setup
1. **Add Environment Variable**: `APP_URL=https://your-app-name.onrender.com`
2. **Auto-Detection**: Also works with Render's `RENDER_EXTERNAL_URL`
3. **Verify Status**: Check `/health/keep-alive/status` endpoint

#### 📊 Monitoring Endpoints
```bash
# Check keep-alive status
GET /health/keep-alive/status

# Manual ping test
POST /health/keep-alive/ping
```

#### 🔍 Example Response
```json
{
  "success": true,
  "keepAlive": {
    "enabled": true,
    "appUrl": "https://your-app-name.onrender.com",
    "pingInterval": "*/14 * * * *",
    "isRunning": true
  },
  "timestamp": "2025-09-15T10:30:00.000Z"
}
```

#### 📋 Log Monitoring
Monitor through Render logs:
```
[INFO] Initializing keep-alive service for https://your-app-name.onrender.com
[INFO] Keep-alive ping scheduled every 14 minutes
[INFO] Keep-alive ping successful - Response time: 234ms
```

> **💡 Result**: Your chatbot stays available 24/7 to help users, even on Render's free tier!

## 🆘 Troubleshooting

### Common Issues

**Webhook not receiving messages**
- Verify webhook URL is publicly accessible
- Check Twilio webhook configuration
- Ensure webhook signature validation passes

**AI responses not working**
- Verify API keys are correct and active
- Check service quotas and rate limits
- Test fallback services

**Database connection issues**
- Confirm Supabase credentials
- Database tables auto-create on first run
- Check Supabase project status

## 📄 License

MIT License with Health Disclaimer - see [LICENSE](LICENSE) file.

**Health Disclaimer**: This software provides general health information only. Always consult qualified healthcare professionals for medical advice. Not intended to replace emergency medical services.

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/your-username/whatsapp-health-assistant/issues)
- 📖 **Documentation**: [Project Wiki](https://github.com/your-username/whatsapp-health-assistant/wiki)
- � **Discussions**: [GitHub Discussions](https://github.com/your-username/whatsapp-health-assistant/discussions)

---

<div align="center">

**🇮🇳 Made with ❤️ for accessible healthcare in rural India**

*Empowering communities with instant access to health information in their preferred language*

[![GitHub Stars](https://img.shields.io/github/stars/your-username/whatsapp-health-assistant?style=social)](https://github.com/your-username/whatsapp-health-assistant)
[![GitHub Forks](https://img.shields.io/github/forks/your-username/whatsapp-health-assistant?style=social)](https://github.com/your-username/whatsapp-health-assistant)

</div>