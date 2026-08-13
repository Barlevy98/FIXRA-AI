export const TRANSLATIONS = {
  English: {
    placeholder: "Have a question?...", send: "Send", 
    upgradeNow: "Upgrade to continue", loading: "Searching...", newChat: "➕ New Chat", historyTitle: "Chat History", langTitle: "Change Language", newChatName: "New Chat",
    greeting: (name: string) => `Hi${name ? ' ' + name : ''}, how can I help?`,
    deleteAlert: "Delete Chat", deleteConfirm: "Are you sure you want to delete this chat?", cancel: "Cancel", delete: "Delete",
    attachTitle: "Attach File", attachSubtitle: "Where would you like to upload from?", camera: "Camera ", gallery: "Gallery ",
    
    aiError: "Sorry, I encountered an error. Don't worry, your credit was not used. Please try again.",
    rateLimitChatError: "Message limit reached 🛑. Invite 5 friends to get free solutions, or upgrade to Premium!", // 🌟 הוספנו כאן!
    
    profileBack: "Back", profileStatus: "Account Status", profilePro: "Active PRO Subscription", profileLeft: "Messages left in bank", profileStore: "Store & Upgrades", profileLogout: "Sign Out", profileFreePlan: "Free Tier", profileSettings: "Settings", profileLang: "Language",
    disclaimer: "FIXRA is an AI and can make mistakes.",

    gameWelcome: (game: string) => `Welcome to your ${game} chat room! 🎮\n\nI'm your FIXRA assistant, ready to help you dominate. You can:\n• Ask for tips and loadouts\n• Get help with specific missions\n• Share screenshots if you are stuck`,
    gameChatTitle: (game: string) => `New ${game} Chat`,
    imageSearch: "📷 Image Search",
    videoSearch: "🎥 Video Search",

    limitBannerText: "Limit reached ⏳",
    limitAlertTitle: "Out of Solves ⏳",
    
    lockedPlaceholder: (plan: string) => {
      const p = String(plan || '').toLowerCase();
      if (p.includes('monthly') || p.includes('onetime')) return "Message limit reached ⏳ (Tap to unlock)";
      return "Daily limit reached ⏳ (Tap to unlock)";
    },

    limitReached: (plan: string) => {
      const p = String(plan || '').toLowerCase();
      if (p.includes('monthly')) return "You've reached your 50 messages limit for this month 😕";
      if (p.includes('onetime')) return "You've used all 50 messages from your pack 😕";
      return "You've reached your free limit for the next 24 hours 😕";
    },

    trialPopupTitle: "Out of Free Solves! 🛑",
    trialPopupSubtitle: "But wait... take 1 FREE Premium Message on us to experience the real power of FIXRA.",
    trialPopupBtn: "🎁 Claim Free Premium Message",
    trialPopupClose: "No thanks, I'll wait 24 hours"
  },
  Hebrew: {
    placeholder: "יש לך שאלה?...", send: "שלח", 
    upgradeNow: "שדרג להמשך שיחה", loading: "מחפש פתרונות...", newChat: "➕ שיחה חדשה", historyTitle: "היסטוריית שיחות", langTitle: "שנה שפה", newChatName: "שיחה חדשה",
    greeting: (name: string) => `היי${name ? ' ' + name : ''}, איך אוכל לעזור?`,
    deleteAlert: "מחיקת שיחה", deleteConfirm: "האם אתה בטוח שברצונך למחוק שיחה זו?", cancel: "ביטול", delete: "מחק",
    attachTitle: "הוספת קובץ", attachSubtitle: "מאיפה תרצה להעלות?", camera: "מצלמה ", gallery: "גלריה ",
    
    aiError: "מצטער, נתקלתי בשגיאה ברשת. אל דאגה, לא ירד לך קרדיט מהחשבון. אנא נסה שוב.",
    rateLimitChatError: "מכסת ההודעות שלך הסתיימה 🛑. הזמן 5 חברים כדי לקבל פתרונות חינם, או שדרג לפרימיום!", // 🌟 הוספנו כאן!

    profileBack: "חזור לצ'אט", profileStatus: "סטטוס החשבון", profilePro: "מנוי PRO פעיל", profileLeft: "הודעות שנותרו בבנק", profileStore: "חנות ושדרוגים", profileLogout: "התנתק מהחשבון", profileFreePlan: "מסלול חינמי", profileSettings: "הגדרות", profileLang: "שפת הממשק",
    disclaimer: "FIXRA מבוסס על בינה מלאכותית ועלול לטעות.",

    gameWelcome: (game: string) => `ברוך הבא לחדר הצ'אט של ${game}! 🎮\n\nאני העוזר החכם שלך ב-FIXRA, מוכן לעזור לך לנצח. אתה יכול:\n• לבקש טיפים והמלצות לציוד\n• לקבל עזרה במשימות ספציפיות\n• לשתף צילומי מסך אם נתקעת`,
    gameChatTitle: (game: string) => `צ'אט ${game} חדש`,
    imageSearch: "📷 חיפוש תמונה",
    videoSearch: "🎥 חיפוש וידאו",

    limitBannerText: "הגעת למגבלת ההודעות ⏳",
    limitAlertTitle: "נגמרו ההודעות ⏳",
    
    lockedPlaceholder: (plan: string) => {
      const p = String(plan || '').toLowerCase();
      if (p.includes('monthly') || p.includes('onetime')) return "מכסת ההודעות הסתיימה ⏳ (לחץ לשדרוג)";
      return "המכסה היומית הסתיימה ⏳ (לחץ לשדרוג)";
    },

    limitReached: (plan: string) => {
      const p = String(plan || '').toLowerCase();
      if (p.includes('monthly')) return "הגעת למכסת ה-50 הודעות שלך לחודש זה 😕";
      if (p.includes('onetime')) return "ניצלת את כל 50 ההודעות מחבילת הפרו שלך 😕";
      return "הגעת למכסת ה-3 הודעות שלך ל-24 שעות הקרובות 😕";
    },

    trialPopupTitle: "נגמרו לך ההודעות להיום! 🛑",
    trialPopupSubtitle: "אבל רגע... קח הודעת PREMIUM אחת במתנה כדי לראות את הכוח האמיתי של המערכת.",
    trialPopupBtn: "🎁 פתח הודעת פרימיום עכשיו",
    trialPopupClose: "לא תודה, אני אעדיף לחכות 24 שעות"
  },
  Russian: {
    placeholder: "Есть вопрос?...", send: "Отправить", 
    upgradeNow: "Обновить сейчас", loading: "Поиск решений...", newChat: "➕ Новый чат", historyTitle: "История чатов", langTitle: "Изменить язык", newChatName: "Новый чат",
    greeting: (name: string) => `Привет${name ? ' ' + name : ''}, чем я могу помочь?`,
    deleteAlert: "Удалить чат", deleteConfirm: "Вы уверены, что хотите удалить этот чат?", cancel: "Отмена", delete: "Удалить",
    attachTitle: "Прикрепить файл", attachSubtitle: "Откуда вы хотите загрузить?", camera: "Камера ", gallery: "Галерея ",
    
    aiError: "Извините, произошла ошибка. Не волнуйтесь, ваш кредит не был списан. Пожалуйста, попробуйте еще раз.",
    rateLimitChatError: "Лимит сообщений исчерпан 🛑. Пригласите 5 друзей, чтобы получить бесплатные решения, или перейдите на Premium!", // 🌟 הוספנו כאן!

    profileBack: "Назад", profileStatus: "Статус аккаунта", profilePro: "Активная PRO подписка", profileLeft: "Осталось сообщений", profileStore: "Магазин и улучшения", profileLogout: "Выйти", profileFreePlan: "Бесплатный тариф", profileSettings: "Настройки", profileLang: "Язык",
    disclaimer: "FIXRA работает на базе ИИ и может допускать ошибки.",

    gameWelcome: (game: string) => `Добро пожаловать в чат ${game}! 🎮\n\nЯ ваш помощник FIXRA, готов помочь вам побеждать. Вы можете:\n• Просить советы и сборки\n• Получать помощь с конкретными миссиями\n• Делиться скриншотами, если застряли`,
    gameChatTitle: (game: string) => `Новый чат ${game}`,
    imageSearch: "📷 Поиск по фото",
    videoSearch: "🎥 Поиск по видео",

    limitBannerText: "Лимит исчерпан ⏳",
    limitAlertTitle: "Лимит исчерпан ⏳",
    
    lockedPlaceholder: (plan: string) => {
      const p = String(plan || '').toLowerCase();
      if (p.includes('monthly') || p.includes('onetime')) return "Лимит сообщений исчерпан ⏳ (Нажмите)";
      return "Дневной лимит исчерпан ⏳ (Нажмите)";
    },

    limitReached: (plan: string) => {
      const p = String(plan || '').toLowerCase();
      if (p.includes('monthly')) return "Вы исчерпали лимит в 50 сообщений на этот месяц 😕";
      if (p.includes('onetime')) return "Вы использовали все 50 сообщений из вашего пакета 😕";
      return "Вы исчерпали лимит на следующие 24 часа 😕";
    },

    trialPopupTitle: "Бесплатные решения закончились! 🛑",
    trialPopupSubtitle: "Но подождите... возьмите 1 БЕСПЛАТНОЕ Premium сообщение, чтобы увидеть реальную мощь.",
    trialPopupBtn: "🎁 Получить Premium сообщение",
    trialPopupClose: "Нет, спасибо, я подожду 24 часа"
  },
  Arabic: {
    placeholder: "لديك سؤال؟...", send: "إرسال", 
    upgradeNow: "قم بالترقية الآن", loading: "جاري البحث...", newChat: "➕ محادثة جديدة", historyTitle: "سجل الدردشة", langTitle: "تغيير اللغة", newChatName: "محادثة جديدة",
    greeting: (name: string) => `مرحباً${name ? ' ' + name : ''}، كيف يمكنني مساعدتك؟`,
    deleteAlert: "حذف المحادثة", deleteConfirm: "هل أنت متأكد أن تريد حذف هذه المحادثة؟", cancel: "إلغاء", delete: "حذف",
    attachTitle: "إرفاق ملف", attachSubtitle: "من أين تريد الرفع؟", camera: "كاميرا ", gallery: "معرض الصور ",
    
    aiError: "عذراً، حدث خطأ. لا تقلق، لم يتم خصم أي رصيد منك. يرجى المحاولة مرة أخرى.",
    rateLimitChatError: "لقد وصلت إلى حد الرسائل 🛑. قم بدعوة 5 أصدقاء للحصول على حلول مجانية، أو قم بالترقية إلى Premium!", // 🌟 הוספנו כאן!

    profileBack: "رجوع", profileStatus: "حالة الحساب", profilePro: "اشتراك PRO نشط", profileLeft: "الرسائل المتبقية", profileStore: "المتجر والترقيات", profileLogout: "تسجيل خروج", profileFreePlan: "الباقة المجانية", profileSettings: "الإعدادات", profileLang: "اللغة",
    disclaimer: "يعتمد FIXRA على الذكاء الاصطناعي وقد يرتكب أخطاء.",

    gameWelcome: (game: string) => `مرحباً بك في غرفة دردشة ${game}! 🎮\n\nأنا مساعد FIXRA الخاص بك، جاهز لمساعدتك على الفوز. يمكنك:\n• طلب نصائح وتجهيزات\n• الحصول على مساعدة في مهام معينة\n• مشاركة لقطات شاشة إذا علقت`,
    gameChatTitle: (game: string) => `دردشة ${game} جديدة`,
    imageSearch: "📷 بحث بالصور",
    videoSearch: "🎥 بحث بالفيديو",

    limitBannerText: "تم الوصول للحد ⏳",
    limitAlertTitle: "نفدت الرسائل ⏳",
    
    lockedPlaceholder: (plan: string) => {
      const p = String(plan || '').toLowerCase();
      if (p.includes('monthly') || p.includes('onetime')) return "انتهى رصيد الرسائل ⏳ (اضغط للترقية)";
      return "تم الوصول للحد اليومي ⏳ (اضغط)";
    },

    limitReached: (plan: string) => {
      const p = String(plan || '').toLowerCase();
      if (p.includes('monthly')) return "لقد وصلت إلى حد الـ 50 رسالة الخاص بك لهذا الشهر 😕";
      if (p.includes('onetime')) return "لقد استخدمت جميع الرسائل الـ 50 من باقتك 😕";
      return "لقد وصلت إلى الحد المجاني لمدة 24 ساعة 😕";
    },

    trialPopupTitle: "نفدت الرسائل المجانية! 🛑",
    trialPopupSubtitle: "لكن انتظر... خذ رسالة Premium مجانية واحدة لترى القوة الحقيقية لـ FIXRA.",
    trialPopupBtn: "🎁 احصل على رسالة Premium",
    trialPopupClose: "لا شكراً، سأنتظر 24 ساعة"
  }
};

export const getTranslation = (language: string) => {
  return TRANSLATIONS[language as keyof typeof TRANSLATIONS] || TRANSLATIONS['Hebrew'];
};