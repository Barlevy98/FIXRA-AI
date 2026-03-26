export const TRANSLATIONS = {
  English: {
    placeholder: "Have a question?...", send: "Send", limitReached: "You've reached your free limit for the next 24 hours 😕", upgradeNow: "Upgrade your plan to continue now", loading: "Searching...", newChat: "➕ New Chat", historyTitle: "Chat History", langTitle: "Change Language", newChatName: "New Chat",
    greeting: (name: string) => `Hi${name ? ' ' + name : ''}, how can I help?`,
    deleteAlert: "Delete Chat", deleteConfirm: "Are you sure you want to delete this chat?", cancel: "Cancel", delete: "Delete",
    attachTitle: "Attach File", attachSubtitle: "Where would you like to upload from?", camera: "Camera ", gallery: "Gallery ",
    aiError: "Sorry, I encountered an error while analyzing your request. Please try again.",
    
    // תרגומי מסך הפרופיל
    profileBack: "Back", profileStatus: "Account Status", profilePro: "Active PRO Subscription", profileLeft: "Messages left in bank", profileStore: "Store & Upgrades", profileLogout: "Sign Out", profileFreePlan: "Basic Plan", profileSettings: "Settings", profileLang: "Language",
    
    // הדיסקליימר החדש
    disclaimer: "FIXRA is an AI and can make mistakes."
  },
  Hebrew: {
    placeholder: "יש לך שאלה?...", send: "שלח", limitReached: "הגעת למכסת ה-3 הודעות שלך ל-24 שעות הקרובות 😕", upgradeNow: "שדרג את המנוי להמשך השיחה כעת", loading: "מחפש פתרונות...", newChat: "➕ שיחה חדשה", historyTitle: "היסטוריית שיחות", langTitle: "שנה שפה", newChatName: "שיחה חדשה",
    greeting: (name: string) => `היי${name ? ' ' + name : ''}, איך אוכל לעזור?`,
    deleteAlert: "מחיקת שיחה", deleteConfirm: "האם אתה בטוח שברצונך למחוק שיחה זו?", cancel: "ביטול", delete: "מחק",
    attachTitle: "הוספת קובץ", attachSubtitle: "מאיפה תרצה להעלות?", camera: "מצלמה ", gallery: "גלריה ",
    aiError: "מצטער, נתקלתי בשגיאה בעת ניתוח הבקשה. אנא נסה שוב.",
    
    // תרגומי מסך הפרופיל
    profileBack: "חזור לצ'אט", profileStatus: "סטטוס החשבון", profilePro: "מנוי PRO פעיל", profileLeft: "הודעות שנותרו בבנק", profileStore: "חנות ושדרוגים", profileLogout: "התנתק מהחשבון", profileFreePlan: "חבילה בסיסית", profileSettings: "הגדרות", profileLang: "שפת הממשק",
    
    // הדיסקליימר החדש
    disclaimer: "FIXRA מבוסס על בינה מלאכותית ועלול לטעות."
  },
  Russian: {
    placeholder: "Есть вопрос?...", send: "Отправить", limitReached: "Вы исчерпали лимит на следующие 24 часа 😕", upgradeNow: "Обновите подписку, чтобы продолжить", loading: "Поиск решений...", newChat: "➕ Новый чат", historyTitle: "История чатов", langTitle: "Изменить язык", newChatName: "Новый чат",
    greeting: (name: string) => `Привет${name ? ' ' + name : ''}, чем я могу помочь?`,
    deleteAlert: "Удалить чат", deleteConfirm: "Вы уверены, что хотите удалить этот чат?", cancel: "Отмена", delete: "Удалить",
    attachTitle: "Прикрепить файл", attachSubtitle: "Откуда вы хотите загрузить?", camera: "Камера ", gallery: "Галерея ",
    aiError: "Извините, произошла ошибка при анализе вашего запроса. Пожалуйста, попробуйте еще раз.",
    
    // תרגומי מסך הפרופיל
    profileBack: "Назад", profileStatus: "Статус аккаунта", profilePro: "Активная PRO подписка", profileLeft: "Осталось сообщений", profileStore: "Магазин и улучшения", profileLogout: "Выйти", profileFreePlan: "Базовый план", profileSettings: "Настройки", profileLang: "Язык",
    
    // הדיסקליימר החדש
    disclaimer: "FIXRA работает на базе ИИ и может допускать ошибки."
  },
  Arabic: {
    placeholder: "لديك سؤال؟...", send: "إرسال", limitReached: "لقد وصلت إلى الحد المجاني لمدة 24 ساعة 😕", upgradeNow: "قم بترقية اشتراكك للمتابعة الآن", loading: "جاري البحث...", newChat: "➕ محادثة جديدة", historyTitle: "سجل الدردشة", langTitle: "تغيير اللغة", newChatName: "محادثة جديدة",
    greeting: (name: string) => `مرحباً${name ? ' ' + name : ''}، كيف يمكنني مساعدتك؟`,
    deleteAlert: "حذف المحادثة", deleteConfirm: "هل أنت متأكد أن تريد حذف هذه المحادثة؟", cancel: "إلغاء", delete: "حذف",
    attachTitle: "إرفاق ملف", attachSubtitle: "من أين تريد الرفع؟", camera: "كاميرا ", gallery: "معرض الصور ",
    aiError: "عذراً، واجهت خطأ أثناء تحليل طلبك. يرجى المحاولة مرة أخرى.",
    
    // תרגומי מסך הפרופיל
    profileBack: "رجوع", profileStatus: "حالة الحساب", profilePro: "اشتراك PRO نشط", profileLeft: "الرسائل المتبقية", profileStore: "المتجر والترقيات", profileLogout: "تسجيل خروج", profileFreePlan: "خطة أساسية", profileSettings: "الإعدادات", profileLang: "اللغة",
    
    // הדיסקליימר החדש
    disclaimer: "يعتمد FIXRA على الذكاء الاصطناعي وقد يرتكب أخطاء."
  }
};

export const getTranslation = (language: string) => {
  return TRANSLATIONS[language as keyof typeof TRANSLATIONS] || TRANSLATIONS['Hebrew'];
};