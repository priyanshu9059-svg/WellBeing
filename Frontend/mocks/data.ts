import type { WellbeingSnapshot } from '@/types';
import type { Language } from '@/types';

export const sampleCodes:Record<string,string> = { 'CAMPUS-DEMO':'Campus wellbeing demo', 'TEAM-CARE':'Workplace wellbeing demo' };
export const suggestedPrompts = ['Exam pressure is getting to me', 'I feel alone today', 'I can’t switch off from work', 'I just need someone to listen'];
export const suggestedPromptsByLanguage:Record<Language,string[]> = {
  English: suggestedPrompts,
  Hindi: ['Exam pressure बहुत ज्यादा लग रहा है', 'आज मैं अकेला/अकेली महसूस कर रहा/रही हूं', 'काम से mind switch off नहीं हो रहा', 'मुझे बस कोई सुनने वाला चाहिए'],
  Hinglish: ['Exam pressure bahut zyada lag raha hai', 'Aaj main lonely feel kar raha/rahi hoon', 'Work se mind switch off nahi ho raha', 'Mujhe bas koi sunne wala chahiye'],
};
export const mockSnapshot:WellbeingSnapshot = { distress:'Elevated', safetyConcern:'Low', stress:'Elevated', socialIsolation:'Moderate', sleepDisruption:'Moderate', escalation:'Moderate', confidence:72, factors:['Recent pressure','Interrupted sleep','Feeling less connected'] };
export const weeklyMood = [{day:'Mon',mood:3},{day:'Tue',mood:2},{day:'Wed',mood:3},{day:'Thu',mood:4},{day:'Fri',mood:3},{day:'Sat',mood:4},{day:'Sun',mood:4}];
export const monthlyMood = [{week:'W1',mood:2.8},{week:'W2',mood:3.2},{week:'W3',mood:3.5},{week:'W4',mood:3.8}];
export const exercises = [
  {id:'box',title:'Box breathing',purpose:'Settle your breathing with an even rhythm.',minutes:2,steps:['Breathe in slowly for 4','Hold gently for 4','Breathe out slowly for 4','Rest for 4']},
  {id:'calm',title:'4–6 calming breathing',purpose:'Lengthen the exhale to invite calm.',minutes:3,steps:['Breathe in for 4','Breathe out for 6','Notice your shoulders soften']},
  {id:'ground',title:'5–4–3–2–1 grounding',purpose:'Reconnect with the room around you.',minutes:5,steps:['Name 5 things you can see','Name 4 things you can feel','Name 3 things you can hear','Name 2 things you can smell','Name 1 thing you can taste']},
  {id:'muscle',title:'Progressive muscle relaxation',purpose:'Release held tension one area at a time.',minutes:8,steps:['Gently tense your hands','Release and notice','Lift then lower your shoulders','Soften your jaw']},
  {id:'reframe',title:'Thought reframing',purpose:'Look at a difficult thought with more space.',minutes:6,steps:['Name the thought','Notice what it makes you feel','Find one fact that adds balance','Write a kinder alternative']},
  {id:'worry',title:'Worry sorting',purpose:'Separate what you can act on from what you cannot.',minutes:5,steps:['Name the worry','Can you influence it today?','Choose one small action or set it down']},
  {id:'compassion',title:'Self-compassion pause',purpose:'Respond to yourself as you would to someone you care about.',minutes:3,steps:['Acknowledge this is difficult','Remember you are not alone in struggling','Offer yourself one kind sentence']},
  {id:'sleep',title:'Sleep wind-down',purpose:'Create a softer transition toward rest.',minutes:10,steps:['Dim the room if you can','Set the phone aside','Relax from forehead to feet','Let thoughts pass without solving them']},
  {id:'next',title:'One manageable next step',purpose:'Turn overwhelm into one possible action.',minutes:4,steps:['Name what needs attention','Make the action smaller','Choose when to begin','Notice what support would help']},
];
export const aggregateData = [{name:'Study pressure',value:68},{name:'Sleep',value:51},{name:'Belonging',value:42},{name:'Workload',value:57}];
