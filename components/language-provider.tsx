'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Language } from '@/types';

export type TranslationKey =
  | 'brandName'
  | 'forProfessionals'
  | 'language'
  | 'home'
  | 'supportHome'
  | 'conversation'
  | 'mood'
  | 'journal'
  | 'exercises'
  | 'wellbeing'
  | 'findCare'
  | 'safetyPlan'
  | 'privacy'
  | 'settings'
  | 'trustLimitations'
  | 'urgentHelp'
  | 'kicker'
  | 'supportTitle'
  | 'supportDescription'
  | 'chatTitle'
  | 'chatDescription'
  | 'moodTitle'
  | 'moodDescription'
  | 'journalTitle'
  | 'journalDescription'
  | 'exercisesTitle'
  | 'exercisesDescription'
  | 'wellbeingTitle'
  | 'wellbeingDescription'
  | 'consultancyTitle'
  | 'consultancyDescription'
  | 'professionalTitle'
  | 'professionalDescription'
  | 'safetyTitle'
  | 'safetyDescription'
  | 'crisisTitle'
  | 'crisisDescription'
  | 'privacyTitle'
  | 'privacyDescription'
  | 'settingsTitle'
  | 'settingsDescription'
  | 'signupTitle'
  | 'signupDescription'
  | 'completeProfileTitle'
  | 'completeProfileDescription'
  | 'profileTitle'
  | 'profileDescription'
  | 'accessTitle'
  | 'accessDescription'
  | 'orgTitle'
  | 'orgDescription'
  | 'trustTitle'
  | 'trustDescription'
  | 'aboutTitle'
  | 'aboutDescription'
  | 'faqTitle'
  | 'faqDescription'
  | 'offlineTitle'
  | 'notFoundTitle'
  | 'heroEyebrow'
  | 'heroTitle'
  | 'heroCopy'
  | 'startTalking'
  | 'exploreTools'
  | 'privacyNote'
  | 'supportWithoutPressure'
  | 'beginWhereYouAre'
  | 'beginWhereCopy'
  | 'choosePace'
  | 'choosePaceCopy'
  | 'shareFits'
  | 'shareFitsCopy'
  | 'nextStep'
  | 'nextStepCopy'
  | 'differentMoments'
  | 'quietTools'
  | 'textVoice'
  | 'textVoiceCopy'
  | 'startConversation'
  | 'privateAnonymous'
  | 'privateAnonymousCopy'
  | 'privacyControls'
  | 'moodJournalTools'
  | 'moodJournalCopy'
  | 'tryCheckIn'
  | 'guidedWellbeing'
  | 'guidedWellbeingCopy'
  | 'exploreExercises'
  | 'safetyCrisis'
  | 'safetyCrisisCopy'
  | 'openSafety'
  | 'nearbyCare'
  | 'nearbyCareCopy'
  | 'findCareNearby'
  | 'professionalPortal'
  | 'professionalPortalCopy'
  | 'openProfessional'
  | 'languageAwareness'
  | 'languageAwarenessCopy'
  | 'learnApproach'
  | 'clarityTrust'
  | 'supportiveNotClinical'
  | 'trustCopy'
  | 'readTrust'
  | 'visitPrivacy'
  | 'questionsWelcome'
  | 'plainAnswers'
  | 'nameQuestion'
  | 'nameAnswer'
  | 'therapyQuestion'
  | 'therapyAnswer'
  | 'emergencyQuestion'
  | 'emergencyAnswer'
  | 'seeFaq'
  | 'smallBeginning'
  | 'oneSentence'
  | 'oneSentenceCopy'
  | 'footerCopy'
  | 'about'
  | 'limitations'
  | 'faq'
  | 'preferences'
  | 'comfortable'
  | 'anonymousMode'
  | 'anonymousModeCopy'
  | 'reducedSensory'
  | 'reducedSensoryCopy'
  | 'installSite'
  | 'installCopy'
  | 'openPrivacyCenter';

const dictionaries: Record<Language, Record<TranslationKey, string>> = {
  English: {
    brandName: 'Wellbeing Support',
    forProfessionals: 'For professionals',
    language: 'Language',
    home: 'Home',
    supportHome: 'Support home',
    conversation: 'Conversation',
    mood: 'Mood',
    journal: 'Journal',
    exercises: 'Exercises',
    wellbeing: 'Wellbeing',
    findCare: 'Find care',
    safetyPlan: 'Safety plan',
    privacy: 'Privacy',
    settings: 'Settings',
    trustLimitations: 'Trust & limitations',
    urgentHelp: 'Get urgent help',
    kicker: 'Wellbeing Support',
    supportTitle: 'What would help right now?',
    supportDescription: 'Choose one small place to begin. You can change direction at any time.',
    chatTitle: 'A quiet conversation',
    chatDescription: 'Share as much or as little as feels comfortable.',
    moodTitle: 'Notice your emotional weather',
    moodDescription: 'Check in without judgment and look for gentle patterns over time.',
    journalTitle: 'A private place for your thoughts',
    journalDescription: 'Your entries stay in this browser and are not sent anywhere.',
    exercisesTitle: 'Make a little room to breathe',
    exercisesDescription: 'Short, guided practices for grounding, rest, and manageable next steps.',
    wellbeingTitle: 'Understand what may be weighing on you',
    wellbeingDescription: 'Choose what to share and receive a non-diagnostic prototype snapshot.',
    consultancyTitle: 'Find care near you',
    consultancyDescription: 'Explore nearby professional support and manage appointment requests in one place.',
    professionalTitle: 'Professional care workspace',
    professionalDescription: 'A prototype portal for counsellors, psychologists, and psychiatrists.',
    safetyTitle: 'Your personal safety plan',
    safetyDescription: 'Prepare supportive steps before a difficult moment becomes overwhelming.',
    crisisTitle: 'Urgent help is available',
    crisisDescription: 'You choose if and when to contact a verified support service.',
    privacyTitle: 'Privacy center',
    privacyDescription: 'See and control what this prototype stores in your browser.',
    settingsTitle: 'Settings',
    settingsDescription: 'Adjust language, privacy, and comfort preferences.',
    signupTitle: 'Create account',
    signupDescription: 'Sign up to sync your support tools. Optional details come next.',
    completeProfileTitle: 'Optional details',
    completeProfileDescription: 'Location, ABHA ID, phone, gender, and age — all skippable.',
    profileTitle: 'Your profile',
    profileDescription: 'View or update location, ABHA ID, phone, gender, and age anytime.',
    accessTitle: 'Anonymous organization access',
    accessDescription: 'A demo code can personalize context without asking who you are.',
    orgTitle: 'Organization wellbeing overview',
    orgDescription: 'Mock aggregate insights with a privacy threshold.',
    trustTitle: 'Trust and limitations',
    trustDescription: 'A plain-language view of what works now and what still needs integration or validation.',
    aboutTitle: 'About Wellbeing Support',
    aboutDescription: 'Why this prototype centers privacy, agency, and small steps.',
    faqTitle: 'Frequently asked questions',
    faqDescription: 'Clear answers about privacy, support, and prototype limits.',
    offlineTitle: 'Offline support',
    notFoundTitle: 'Page not found',
    heroEyebrow: 'A quiet place to begin',
    heroTitle: 'You don\'t have to face this moment alone.',
    heroCopy: 'Talk, type, or simply take a moment. Support begins at your pace.',
    startTalking: 'Start Talking',
    exploreTools: 'Explore support tools',
    privacyNote: 'Anonymous by default - Your prototype data stays on this device',
    supportWithoutPressure: 'Support without pressure',
    beginWhereYouAre: 'Begin wherever you are.',
    beginWhereCopy: 'There is no right order and no account required. Take one step, pause, or leave whenever you choose.',
    choosePace: 'Choose your pace',
    choosePaceCopy: 'Type, speak, explore a tool, or simply look around.',
    shareFits: 'Share what fits',
    shareFitsCopy: 'Answer optional prompts without giving your identity.',
    nextStep: 'Find a next step',
    nextStepCopy: 'Receive a short, manageable suggestion, not a diagnosis.',
    differentMoments: 'Different moments need different support',
    quietTools: 'Quiet tools, ready when you are.',
    textVoice: 'Text & voice conversations',
    textVoiceCopy: 'Talk with a calm local support simulation that listens one question at a time.',
    startConversation: 'Start a conversation',
    privateAnonymous: 'Private & anonymous',
    privateAnonymousCopy: 'No account or identity disclosure. You control what is stored in this browser.',
    privacyControls: 'See privacy controls',
    moodJournalTools: 'Mood & journal tools',
    moodJournalCopy: 'Notice patterns and make space for thoughts without streaks or rewards.',
    tryCheckIn: 'Try a check-in',
    guidedWellbeing: 'Guided wellbeing exercises',
    guidedWellbeingCopy: 'Breathing, grounding, reframing, rest, and one manageable next step.',
    exploreExercises: 'Explore exercises',
    safetyCrisis: 'Safety & crisis support',
    safetyCrisisCopy: 'Prepare a personal safety plan and quickly reach verified resources.',
    openSafety: 'Open safety tools',
    nearbyCare: 'Find nearby professional care',
    nearbyCareCopy: 'Explore prototype clinic and safety listings, then manage appointment requests.',
    findCareNearby: 'Find care nearby',
    professionalPortal: 'Professional care portal',
    professionalPortalCopy: 'A dedicated workspace for counsellors, psychologists, and psychiatrists.',
    openProfessional: 'Open professional portal',
    languageAwareness: 'Cultural & language awareness',
    languageAwarenessCopy: 'Choose English, Hindi, or Hinglish in this prototype experience.',
    learnApproach: 'Learn about the approach',
    clarityTrust: 'Clarity builds trust',
    supportiveNotClinical: 'Supportive, not clinical.',
    trustCopy: 'Wellbeing Support is a frontend prototype. It does not diagnose, prescribe medication, monitor you, contact a counsellor, or dispatch emergency help. Your local choices remain yours.',
    readTrust: 'Read trust & limitations',
    visitPrivacy: 'Visit privacy center',
    questionsWelcome: 'Questions are welcome',
    plainAnswers: 'Clear answers, in plain language.',
    nameQuestion: 'Do I need to share my name?',
    nameAnswer: 'No. Anonymous mode is the default, and all identity fields stay empty unless you independently choose otherwise.',
    therapyQuestion: 'Is this a therapist or diagnostic service?',
    therapyAnswer: 'No. The conversation and wellbeing summaries are local, mocked, and non-diagnostic.',
    emergencyQuestion: 'Can it call emergency help automatically?',
    emergencyAnswer: 'No. You must clearly choose a phone link before your device starts a call.',
    seeFaq: 'See all frequently asked questions',
    smallBeginning: 'A small beginning is enough',
    oneSentence: 'You can start with one sentence.',
    oneSentenceCopy: 'Share only what feels manageable right now.',
    footerCopy: 'A frontend-only prototype. Not a replacement for professional or emergency care.',
    about: 'About',
    limitations: 'Limitations',
    faq: 'FAQ',
    preferences: 'Preferences',
    comfortable: 'Make the experience comfortable',
    anonymousMode: 'Anonymous mode',
    anonymousModeCopy: 'Recommended for this local prototype.',
    reducedSensory: 'Reduced sensory detail',
    reducedSensoryCopy: 'Use calmer transitions and fewer atmospheric effects.',
    installSite: 'Install this website',
    installCopy: 'In a supported browser, open the browser menu and choose "Install app" or "Add to Home screen." This is a PWA, not a native Android or iOS app.',
    openPrivacyCenter: 'Open privacy center',
  },
  Hindi: {
    brandName: 'वेलबीइंग सपोर्ट',
    forProfessionals: 'प्रोफेशनल्स के लिए',
    language: 'भाषा',
    home: 'होम',
    supportHome: 'सहायता होम',
    conversation: 'बातचीत',
    mood: 'मूड',
    journal: 'जर्नल',
    exercises: 'अभ्यास',
    wellbeing: 'वेलबीइंग',
    findCare: 'देखभाल खोजें',
    safetyPlan: 'सुरक्षा योजना',
    privacy: 'गोपनीयता',
    settings: 'सेटिंग्स',
    trustLimitations: 'भरोसा और सीमाएं',
    urgentHelp: 'तुरंत मदद लें',
    kicker: 'वेलबीइंग सपोर्ट',
    supportTitle: 'अभी किस तरह की मदद चाहिए?',
    supportDescription: 'शुरू करने के लिए एक छोटा कदम चुनें। आप कभी भी दिशा बदल सकते हैं।',
    chatTitle: 'शांत बातचीत',
    chatDescription: 'जितना सहज लगे, उतना ही साझा करें।',
    moodTitle: 'अपनी भावनाओं का मौसम समझें',
    moodDescription: 'बिना निर्णय के चेक इन करें और धीरे-धीरे पैटर्न देखें।',
    journalTitle: 'आपके विचारों के लिए निजी जगह',
    journalDescription: 'आपकी एंट्री इसी ब्राउजर में रहती हैं और कहीं भेजी नहीं जातीं।',
    exercisesTitle: 'सांस लेने की थोड़ी जगह बनाएं',
    exercisesDescription: 'ग्राउंडिंग, आराम और छोटे अगले कदमों के लिए छोटे अभ्यास।',
    wellbeingTitle: 'समझें कि आप पर क्या भारी हो सकता है',
    wellbeingDescription: 'जो साझा करना चाहें चुनें और non-diagnostic prototype snapshot पाएं।',
    consultancyTitle: 'अपने पास देखभाल खोजें',
    consultancyDescription: 'पास की professional support देखें और appointments एक जगह manage करें।',
    professionalTitle: 'प्रोफेशनल केयर वर्कस्पेस',
    professionalDescription: 'काउंसलर, साइकोलॉजिस्ट और साइकियाट्रिस्ट के लिए prototype portal.',
    safetyTitle: 'आपकी व्यक्तिगत सुरक्षा योजना',
    safetyDescription: 'कठिन पल बढ़ने से पहले supportive steps तैयार करें।',
    crisisTitle: 'तुरंत मदद उपलब्ध है',
    crisisDescription: 'Verified support service से कब संपर्क करना है, यह आप चुनते हैं।',
    privacyTitle: 'गोपनीयता केंद्र',
    privacyDescription: 'देखें और नियंत्रित करें कि यह prototype आपके browser में क्या रखता है।',
    settingsTitle: 'सेटिंग्स',
    settingsDescription: 'भाषा, privacy और comfort preferences बदलें।',
    signupTitle: 'खाता बनाएँ',
    signupDescription: 'सपोर्ट टूल्स सिंक करने के लिए साइन अप करें। वैकल्पिक विवरण आगे आएंगे।',
    completeProfileTitle: 'वैकल्पिक विवरण',
    completeProfileDescription: 'स्थान, ABHA ID, फ़ोन, लिंग और आयु — सब छोड़ सकते हैं।',
    profileTitle: 'आपकी प्रोफ़ाइल',
    profileDescription: 'स्थान, ABHA ID, फ़ोन, लिंग और आयु कभी भी देखें या बदलें।',
    accessTitle: 'Anonymous organization access',
    accessDescription: 'Demo code बिना आपकी पहचान पूछे context personalize कर सकता है।',
    orgTitle: 'Organization wellbeing overview',
    orgDescription: 'Privacy threshold के साथ mock aggregate insights.',
    trustTitle: 'भरोसा और सीमाएं',
    trustDescription: 'अभी क्या काम करता है और क्या integration/validation चाहिए, plain view.',
    aboutTitle: 'वेलबीइंग सपोर्ट के बारे में',
    aboutDescription: 'यह prototype privacy, agency और छोटे कदमों को क्यों केंद्र में रखता है।',
    faqTitle: 'अक्सर पूछे जाने वाले सवाल',
    faqDescription: 'Privacy, support और prototype limits पर साफ जवाब।',
    offlineTitle: 'Offline support',
    notFoundTitle: 'Page नहीं मिला',
    heroEyebrow: 'शुरू करने की शांत जगह',
    heroTitle: 'आपको यह पल अकेले नहीं झेलना है।',
    heroCopy: 'बात करें, टाइप करें, या बस एक पल लें। सहायता आपकी गति से शुरू होती है।',
    startTalking: 'बात शुरू करें',
    exploreTools: 'Support tools देखें',
    privacyNote: 'Default anonymous - आपका prototype data इसी device पर रहता है',
    supportWithoutPressure: 'बिना दबाव के सहायता',
    beginWhereYouAre: 'जहां हैं, वहीं से शुरू करें।',
    beginWhereCopy: 'कोई सही order नहीं और account जरूरी नहीं। एक कदम लें, रुकें, या जब चाहें छोड़ दें।',
    choosePace: 'अपनी गति चुनें',
    choosePaceCopy: 'Type करें, बोलें, tool खोलें, या बस देखें।',
    shareFits: 'जो ठीक लगे वही साझा करें',
    shareFitsCopy: 'अपनी पहचान बताए बिना optional prompts का जवाब दें।',
    nextStep: 'अगला छोटा कदम खोजें',
    nextStepCopy: 'छोटा manageable suggestion पाएं, diagnosis नहीं।',
    differentMoments: 'हर पल को अलग तरह की सहायता चाहिए',
    quietTools: 'शांत tools, जब आप तैयार हों।',
    textVoice: 'Text और voice conversations',
    textVoiceCopy: 'Calm local support simulation से बात करें जो एक बार में एक सवाल पूछता है।',
    startConversation: 'Conversation शुरू करें',
    privateAnonymous: 'Private और anonymous',
    privateAnonymousCopy: 'Account या identity disclosure नहीं। Browser में क्या stored है, control आपके पास।',
    privacyControls: 'Privacy controls देखें',
    moodJournalTools: 'Mood और journal tools',
    moodJournalCopy: 'Patterns notice करें और thoughts के लिए space बनाएं, बिना streaks या rewards।',
    tryCheckIn: 'Check-in करें',
    guidedWellbeing: 'Guided wellbeing exercises',
    guidedWellbeingCopy: 'Breathing, grounding, reframing, rest और एक manageable next step.',
    exploreExercises: 'Exercises देखें',
    safetyCrisis: 'Safety और crisis support',
    safetyCrisisCopy: 'Personal safety plan बनाएं और verified resources तक जल्दी पहुंचें।',
    openSafety: 'Safety tools खोलें',
    nearbyCare: 'पास की professional care खोजें',
    nearbyCareCopy: 'Prototype clinic और safety listings देखें, फिर appointments manage करें।',
    findCareNearby: 'Nearby care खोजें',
    professionalPortal: 'Professional care portal',
    professionalPortalCopy: 'Counsellors, psychologists और psychiatrists के लिए dedicated workspace.',
    openProfessional: 'Professional portal खोलें',
    languageAwareness: 'Cultural और language awareness',
    languageAwarenessCopy: 'इस prototype में English, Hindi या Hinglish चुनें।',
    learnApproach: 'Approach जानें',
    clarityTrust: 'Clarity से भरोसा बनता है',
    supportiveNotClinical: 'Supportive, clinical नहीं।',
    trustCopy: 'Wellbeing Support एक frontend prototype है। यह diagnose, medication prescribe, monitor, counsellor contact या emergency dispatch नहीं करता। आपके local choices आपके रहते हैं।',
    readTrust: 'Trust और limitations पढ़ें',
    visitPrivacy: 'Privacy center जाएं',
    questionsWelcome: 'सवाल पूछना ठीक है',
    plainAnswers: 'साफ जवाब, आसान भाषा में।',
    nameQuestion: 'क्या मुझे अपना नाम बताना होगा?',
    nameAnswer: 'नहीं। Anonymous mode default है, और identity fields empty रहती हैं जब तक आप खुद न चुनें।',
    therapyQuestion: 'क्या यह therapist या diagnostic service है?',
    therapyAnswer: 'नहीं। Conversation और wellbeing summaries local, mocked और non-diagnostic हैं।',
    emergencyQuestion: 'क्या यह emergency help अपने आप call कर सकता है?',
    emergencyAnswer: 'नहीं। Call शुरू करने से पहले आपको phone link साफ तौर पर चुनना होगा।',
    seeFaq: 'सभी FAQs देखें',
    smallBeginning: 'छोटी शुरुआत काफी है',
    oneSentence: 'आप एक sentence से शुरू कर सकते हैं।',
    oneSentenceCopy: 'अभी जितना manageable लगे, उतना ही साझा करें।',
    footerCopy: 'Frontend-only prototype. Professional या emergency care का replacement नहीं।',
    about: 'About',
    limitations: 'Limitations',
    faq: 'FAQ',
    preferences: 'Preferences',
    comfortable: 'Experience comfortable बनाएं',
    anonymousMode: 'Anonymous mode',
    anonymousModeCopy: 'इस local prototype के लिए recommended.',
    reducedSensory: 'Reduced sensory detail',
    reducedSensoryCopy: 'Calmer transitions और कम sensory effects इस्तेमाल करें।',
    installSite: 'Website install करें',
    installCopy: 'Supported browser में menu खोलकर "Install app" या "Add to Home screen" चुनें। यह PWA है, native Android या iOS app नहीं।',
    openPrivacyCenter: 'Privacy center खोलें',
  },
  Hinglish: {
    brandName: 'Wellbeing Support',
    forProfessionals: 'Professionals ke liye',
    language: 'Language',
    home: 'Home',
    supportHome: 'Support home',
    conversation: 'Conversation',
    mood: 'Mood',
    journal: 'Journal',
    exercises: 'Exercises',
    wellbeing: 'Wellbeing',
    findCare: 'Find care',
    safetyPlan: 'Safety plan',
    privacy: 'Privacy',
    settings: 'Settings',
    trustLimitations: 'Trust & limitations',
    urgentHelp: 'Urgent help',
    kicker: 'Wellbeing Support',
    supportTitle: 'Abhi kya help karega?',
    supportDescription: 'Start karne ke liye ek chhota step choose karo. Direction kabhi bhi change kar sakte ho.',
    chatTitle: 'Ek quiet conversation',
    chatDescription: 'Jitna comfortable lage, utna share karo.',
    moodTitle: 'Apna emotional weather notice karo',
    moodDescription: 'Judgment ke bina check in karo aur time ke saath gentle patterns dekho.',
    journalTitle: 'Thoughts ke liye private jagah',
    journalDescription: 'Aapki entries isi browser mein rehti hain, kahin send nahi hoti.',
    exercisesTitle: 'Thoda sa room to breathe',
    exercisesDescription: 'Grounding, rest aur manageable next steps ke liye short guided practices.',
    wellbeingTitle: 'Samjho kya heavy feel ho raha hai',
    wellbeingDescription: 'Jo share karna hai choose karo aur non-diagnostic prototype snapshot lo.',
    consultancyTitle: 'Nearby care find karo',
    consultancyDescription: 'Nearby professional support explore karo aur appointment requests manage karo.',
    professionalTitle: 'Professional care workspace',
    professionalDescription: 'Counsellors, psychologists aur psychiatrists ke liye prototype portal.',
    safetyTitle: 'Aapka personal safety plan',
    safetyDescription: 'Difficult moment overwhelming hone se pehle supportive steps prepare karo.',
    crisisTitle: 'Urgent help available hai',
    crisisDescription: 'Verified support service ko kab contact karna hai, choice aapki hai.',
    privacyTitle: 'Privacy center',
    privacyDescription: 'Dekho aur control karo ki prototype browser mein kya store karta hai.',
    settingsTitle: 'Settings',
    settingsDescription: 'Language, privacy aur comfort preferences adjust karo.',
    signupTitle: 'Account banao',
    signupDescription: 'Support tools sync karne ke liye sign up karo. Optional details baad mein aate hain.',
    completeProfileTitle: 'Optional details',
    completeProfileDescription: 'Location, ABHA ID, phone, gender, aur age — sab skip kar sakte ho.',
    profileTitle: 'Aapki profile',
    profileDescription: 'Location, ABHA ID, phone, gender, aur age kabhi bhi dekho ya badlo.',
    accessTitle: 'Anonymous organization access',
    accessDescription: 'Demo code bina identity pooche context personalize kar sakta hai.',
    orgTitle: 'Organization wellbeing overview',
    orgDescription: 'Privacy threshold ke saath mock aggregate insights.',
    trustTitle: 'Trust and limitations',
    trustDescription: 'Kya abhi works karta hai aur kya integration/validation chahiye, plain view.',
    aboutTitle: 'About Wellbeing Support',
    aboutDescription: 'Ye prototype privacy, agency aur small steps ko center kyun karta hai.',
    faqTitle: 'Frequently asked questions',
    faqDescription: 'Privacy, support aur prototype limits ke clear answers.',
    offlineTitle: 'Offline support',
    notFoundTitle: 'Page not found',
    heroEyebrow: 'Begin karne ki quiet jagah',
    heroTitle: 'Is moment ko akele face karna zaroori nahi.',
    heroCopy: 'Talk, type, ya bas ek moment lo. Support aapki pace par start hota hai.',
    startTalking: 'Start Talking',
    exploreTools: 'Support tools explore karo',
    privacyNote: 'Anonymous by default - prototype data isi device par rehta hai',
    supportWithoutPressure: 'Pressure ke bina support',
    beginWhereYouAre: 'Jahan ho, wahin se begin karo.',
    beginWhereCopy: 'Koi right order nahi, account required nahi. Ek step lo, pause karo, ya jab chaho leave karo.',
    choosePace: 'Apni pace choose karo',
    choosePaceCopy: 'Type karo, speak karo, tool explore karo, ya simply look around.',
    shareFits: 'Jo fit lage woh share karo',
    shareFitsCopy: 'Identity diye bina optional prompts answer karo.',
    nextStep: 'Next step find karo',
    nextStepCopy: 'Short manageable suggestion milega, diagnosis nahi.',
    differentMoments: 'Different moments ko different support chahiye',
    quietTools: 'Quiet tools, ready when you are.',
    textVoice: 'Text & voice conversations',
    textVoiceCopy: 'Calm local support simulation se baat karo, one question at a time.',
    startConversation: 'Conversation start karo',
    privateAnonymous: 'Private & anonymous',
    privateAnonymousCopy: 'Account ya identity disclosure nahi. Browser mein kya store hoga, control aapka.',
    privacyControls: 'Privacy controls dekho',
    moodJournalTools: 'Mood & journal tools',
    moodJournalCopy: 'Patterns notice karo aur thoughts ke liye space banao, streaks ya rewards ke bina.',
    tryCheckIn: 'Check-in try karo',
    guidedWellbeing: 'Guided wellbeing exercises',
    guidedWellbeingCopy: 'Breathing, grounding, reframing, rest aur one manageable next step.',
    exploreExercises: 'Exercises explore karo',
    safetyCrisis: 'Safety & crisis support',
    safetyCrisisCopy: 'Personal safety plan prepare karo aur verified resources tak quickly reach karo.',
    openSafety: 'Safety tools kholo',
    nearbyCare: 'Nearby professional care find karo',
    nearbyCareCopy: 'Prototype clinic aur safety listings explore karo, phir appointments manage karo.',
    findCareNearby: 'Nearby care find karo',
    professionalPortal: 'Professional care portal',
    professionalPortalCopy: 'Counsellors, psychologists aur psychiatrists ke liye dedicated workspace.',
    openProfessional: 'Professional portal kholo',
    languageAwareness: 'Cultural & language awareness',
    languageAwarenessCopy: 'English, Hindi, ya Hinglish choose karo in this prototype experience.',
    learnApproach: 'Approach ke baare mein jaanen',
    clarityTrust: 'Clarity trust build karti hai',
    supportiveNotClinical: 'Supportive, clinical nahi.',
    trustCopy: 'Wellbeing Support frontend prototype hai. Ye diagnose, medication prescribe, monitor, counsellor contact, ya emergency dispatch nahi karta. Local choices aapke hain.',
    readTrust: 'Trust & limitations padho',
    visitPrivacy: 'Privacy center visit karo',
    questionsWelcome: 'Questions welcome hain',
    plainAnswers: 'Clear answers, simple language mein.',
    nameQuestion: 'Kya mujhe naam share karna hoga?',
    nameAnswer: 'Nahi. Anonymous mode default hai, aur identity fields empty rehti hain jab tak aap khud choose na karo.',
    therapyQuestion: 'Kya ye therapist ya diagnostic service hai?',
    therapyAnswer: 'Nahi. Conversation aur wellbeing summaries local, mocked, aur non-diagnostic hain.',
    emergencyQuestion: 'Kya ye automatically emergency help call kar sakta hai?',
    emergencyAnswer: 'Nahi. Device call start karne se pehle aapko phone link clearly choose karna hoga.',
    seeFaq: 'Saare FAQs dekho',
    smallBeginning: 'Small beginning enough hai',
    oneSentence: 'Ek sentence se start kar sakte ho.',
    oneSentenceCopy: 'Abhi jitna manageable lage, utna share karo.',
    footerCopy: 'Frontend-only prototype. Professional ya emergency care ka replacement nahi.',
    about: 'About',
    limitations: 'Limitations',
    faq: 'FAQ',
    preferences: 'Preferences',
    comfortable: 'Experience comfortable banao',
    anonymousMode: 'Anonymous mode',
    anonymousModeCopy: 'Is local prototype ke liye recommended.',
    reducedSensory: 'Reduced sensory detail',
    reducedSensoryCopy: 'Calmer transitions aur fewer atmospheric effects use karo.',
    installSite: 'Website install karo',
    installCopy: 'Supported browser mein browser menu open karke "Install app" ya "Add to Home screen" choose karo. Ye PWA hai, native Android ya iOS app nahi.',
    openPrivacyCenter: 'Privacy center kholo',
  },
};

const languageOptions: Language[] = ['English', 'Hindi', 'Hinglish'];

const LanguageContext = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
}>({
  language: 'English',
  setLanguage: () => {},
  t: (key) => dictionaries.English[key],
});

function normalizeLanguage(value: string | null): Language {
  if (value === 'Hindi' || value === 'हिन्दी') return 'Hindi';
  if (value === 'Hinglish') return 'Hinglish';
  return 'English';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'English';
    return normalizeLanguage(window.localStorage.getItem('wellbeing-support:language'));
  });

  const value = useMemo(() => ({
    language,
    setLanguage: (next: Language) => {
      setLanguageState(next);
      localStorage.setItem('wellbeing-support:language', next);
      document.documentElement.lang = next === 'Hindi' ? 'hi' : next === 'Hinglish' ? 'en-IN' : 'en';
    },
    t: (key: TranslationKey) => dictionaries[language][key],
  }), [language]);

  useEffect(() => {
    document.documentElement.lang = language === 'Hindi' ? 'hi' : language === 'Hinglish' ? 'en-IN' : 'en';
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageSelect({ id }: { id: string }) {
  const { language, setLanguage, t } = useLanguage();
  return (
    <>
      <label className="sr-only" htmlFor={id}>{t('language')}</label>
      <select id={id} value={language} onChange={(event) => setLanguage(normalizeLanguage(event.target.value))} aria-label={t('language')}>
        {languageOptions.map((option) => <option key={option} value={option}>{option === 'Hindi' ? 'हिन्दी' : option}</option>)}
      </select>
    </>
  );
}
