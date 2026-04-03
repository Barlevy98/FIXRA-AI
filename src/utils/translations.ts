export const TRANSLATIONS = {
  English: {
    placeholder: "Have a question?...", send: "Send", limitReached: "You've reached your free limit for the next 24 hours 😕", upgradeNow: "Upgrade your plan to continue now", loading: "Searching...", newChat: "➕ New Chat", historyTitle: "Chat History", langTitle: "Change Language", newChatName: "New Chat",
    greeting: (name: string) => `Hi${name ? ' ' + name : ''}, how can I help?`,
    deleteAlert: "Delete Chat", deleteConfirm: "Are you sure you want to delete this chat?", cancel: "Cancel", delete: "Delete",
    attachTitle: "Attach File", attachSubtitle: "Where would you like to upload from?", camera: "Camera ", gallery: "Gallery ",
    
    // השגיאה החדשה שמרגיעה את המשתמש
    aiError: "Sorry, I encountered an error. Don't worry, your credit was not used. Please try again.",
    
    // תרגומי מסך הפרופיל
    profileBack: "Back", profileStatus: "Account Status", profilePro: "Active PRO Subscription", profileLeft: "Messages left in bank", profileStore: "Store & Upgrades", profileLogout: "Sign Out", profileFreePlan: "Free Tier", profileSettings: "Settings", profileLang: "Language",
    
    // הדיסקליימר
    disclaimer: "FIXRA is an AI and can make mistakes."
  },
  Hebrew: {
    placeholder: "יש לך שאלה?...", send: "שלח", limitReached: "הגעת למכסת ה-3 הודעות שלך ל-24 שעות הקרובות 😕", upgradeNow: "שדרג את המנוי להמשך השיחה כעת", loading: "מחפש פתרונות...", newChat: "➕ שיחה חדשה", historyTitle: "היסטוריית שיחות", langTitle: "שנה שפה", newChatName: "שיחה חדשה",
    greeting: (name: string) => `היי${name ? ' ' + name : ''}, איך אוכל לעזור?`,
    deleteAlert: "מחיקת שיחה", deleteConfirm: "האם אתה בטוח שברצונך למחוק שיחה זו?", cancel: "ביטול", delete: "מחק",
    attachTitle: "הוספת קובץ", attachSubtitle: "מאיפה תרצה להעלות?", camera: "מצלמה ", gallery: "גלריה ",
    
    // השגיאה החדשה שמרגיעה את המשתמש
    aiError: "מצטער, נתקלתי בשגיאה ברשת. אל דאגה, לא ירד לך קרדיט מהחשבון. אנא נסה שוב.",
    
    // תרגומי מסך הפרופיל
    profileBack: "חזור לצ'אט", profileStatus: "סטטוס החשבון", profilePro: "מנוי PRO פעיל", profileLeft: "הודעות שנותרו בבנק", profileStore: "חנות ושדרוגים", profileLogout: "התנתק מהחשבון", profileFreePlan: "מסלול חינמי", profileSettings: "הגדרות", profileLang: "שפת הממשק",
    
    // הדיסקליימר
    disclaimer: "FIXRA מבוסס על בינה מלאכותית ועלול לטעות."
  },
  Russian: {
    placeholder: "Есть вопрос?...", send: "Отправить", limitReached: "Вы исчерпали лимит на следующие 24 часа 😕", upgradeNow: "Обновите подписку, чтобы продолжить", loading: "Поиск решений...", newChat: "➕ Новый чат", historyTitle: "История чатов", langTitle: "Изменить язык", newChatName: "Новый чат",
    greeting: (name: string) => `Привет${name ? ' ' + name : ''}, чем я могу помочь?`,
    deleteAlert: "Удалить чат", deleteConfirm: "Вы уверены, что хотите удалить этот чат?", cancel: "Отмена", delete: "Удалить",
    attachTitle: "Прикрепить файл", attachSubtitle: "Откуда вы хотите загрузить?", camera: "Камера ", gallery: "Галерея ",
    
    // השגיאה החדשה שמרגיעה את המשתמש
    aiError: "Извините, произошла ошибка. Не волнуйтесь, ваш кредит не был списан. Пожалуйста, попробуйте еще раз.",
    
    // תרגומי מסך הפרופיל
    profileBack: "Назад", profileStatus: "Статус аккаунта", profilePro: "Активная PRO подписка", profileLeft: "Осталось сообщений", profileStore: "Магазин и улучшения", profileLogout: "Выйти", profileFreePlan: "Бесплатный тариф", profileSettings: "Настройки", profileLang: "Язык",
    
    // הדיסקליימר
    disclaimer: "FIXRA работает на базе ИИ и может допускать ошибки."
  },
  Arabic: {
    placeholder: "لديك سؤال؟...", send: "إرسال", limitReached: "لقد وصلت إلى الحد المجاني لمدة 24 ساعة 😕", upgradeNow: "قم بترقية اشتراكك للمتابعة الآن", loading: "جاري البحث...", newChat: "➕ محادثة جديدة", historyTitle: "سجل الدردشة", langTitle: "تغيير اللغة", newChatName: "محادثة جديدة",
    greeting: (name: string) => `مرحباً${name ? ' ' + name : ''}، كيف يمكنني مساعدتك؟`,
    deleteAlert: "حذف المحادثة", deleteConfirm: "هل أنت متأكد أن تريد حذف هذه المحادثة؟", cancel: "إلغاء", delete: "حذف",
    attachTitle: "إرفاق ملف", attachSubtitle: "من أين تريد الرفع؟", camera: "كاميرا ", gallery: "معرض الصور ",
    
    // השגיאה החדשה שמרגיעה את המשתמש
    aiError: "عذراً، حدث خطأ. لا تقلق، لم يتم خصم أي رصيد منك. يرجى المحاولة مرة أخرى.",
    
    // תרגומי מסך הפרופיל
    profileBack: "رجوع", profileStatus: "حالة الحساب", profilePro: "اشتراك PRO نشط", profileLeft: "الرسائل المتبقية", profileStore: "المتجر والترقيات", profileLogout: "تسجيل خروج", profileFreePlan: "الباقة المجانية", profileSettings: "الإعدادات", profileLang: "اللغة",
    
    // הדיסקליימר
    disclaimer: "يعتمد FIXRA على الذكاء الاصطناعي وقد يرتكب أخطاء."
  }
};

export const getTranslation = (language: string) => {
  return TRANSLATIONS[language as keyof typeof TRANSLATIONS] || TRANSLATIONS['Hebrew'];
};