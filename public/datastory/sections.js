window.atlasBeats=[
 {id:'growth',scene:'growth',anchor:'center',eyebrow:'Growth',title:'The field is growing.',paragraphs:window.atlasStoryText.chapters.growth,length:3.4,lead:'Every circle represents an experiment.',note:'Circle area represents reported sample size. Summed samples may include the same person more than once.'},
 {id:'geography',scene:'map',anchor:'bottom-left',eyebrow:'Geography',title:'A wide reach. An uneven distribution.',paragraphs:window.atlasStoryText.chapters.geography,note:'Location climate does not establish participant thermal history. Hong Kong is recorded separately.'},
 {id:'participants',scene:'participants',anchor:'bottom-left',eyebrow:'Participants',title:'Participant age and BMI',paragraphs:window.atlasStoryText.chapters.participants,note:'Boxes summarise experiment means. BMI guides do not classify individuals.'},
 {id:'profile',scene:'criteria',anchor:'bottom-center',eyebrow:'Selection criteria',title:'Who gets to take part?',paragraphs:window.atlasStoryText.chapters.profile,criterion:4,note:'The criteria overlap. Pink marks reported criteria.'},
 {id:'setting',scene:'setting',anchor:'bottom-left',eyebrow:'Experimental setting',title:'Experimental settings',paragraphs:window.atlasStoryText.chapters.setting},
 {id:'spaces',scene:'spaces',anchor:'bottom-right',eyebrow:'Spatial typology',title:'What kind of space do we study?',paragraphs:window.atlasStoryText.chapters.setting,note:'Experimental setting and spatial typology describe different aspects of the same corpus.'},
 {id:'temperatures',scene:'temperatures',anchor:'bottom-right',eyebrow:'Thermal conditions',title:'Which temperatures do we investigate?',paragraphs:window.atlasStoryText.chapters.temperatures,note:'Operative temperature where reported, otherwise air temperature. Sequence, duration and achieved exposure require context.'},
 {id:'signals',scene:'prevalence',anchor:'bottom-left',eyebrow:'Physiological signals',title:'Which signals are measured?',paragraphs:window.atlasStoryText.chapters.signals,note:'An experiment can measure several signals.'},
 {id:'measurement',scene:'bodies',reveal:2,anchor:'body-left',eyebrow:'Sites and devices',title:'One signal, different measurements.',paragraphs:[
  'Three experiments measured skin temperature using <strong>different body sites and devices</strong>: iButtons, an infrared camera and thermocouples.',
  'Two calculated mean skin temperature; one reported local temperatures. <strong>The sites, sensing method and calculation define the outcome.</strong>'
 ],note:'Links lead to original publications. These examples illustrate methodological differences, not device agreement.'},
 {id:'protocol',scene:'bodies',reveal:5,anchor:'body-right',eyebrow:'Exposure and protocol',title:'Conditions give a reading context.',paragraphs:[
  'These measurements belong to <strong>different exposures, session lengths and normalisation periods</strong>.',
  '<strong>Activity and clothing</strong> add further context. Keeping these details with the measurement helps a researcher assess what a comparison would mean.'
 ],note:'“Not reported” describes the publication record; it does not establish that no control was applied.'},
 {id:'timing',scene:'bodies',reveal:6,anchor:'body-center',eyebrow:'Timing',title:'How long—and when?',paragraphs:[
  'A 60-minute session specifies a duration. An afternoon scheduling window locates it in the day. <strong>Both belong with the physiological observation.</strong>',
  'Two of these publications provide clock-time windows; the third leaves that context unspecified.'
 ],note:'Reported scheduling windows do not establish continuous data coverage. Hatching marks unreported clock time.'},
 {id:'reporting',scene:'reporting',anchor:'bottom-right',eyebrow:'Reported context',title:'How much do we know about the participants?',paragraphs:[
  'Thermal history was reported in '+window.atlasStoryText.thermalHistory+'.',
  ...window.atlasStoryText.chapters.reporting,
 ],note:'Reporting a field differs from availability of a numeric mean.'},
 {id:'reuse',scene:'reuse',anchor:'access',eyebrow:'Access and reuse',title:'What travels with the data?',paragraphs:window.atlasStoryText.chapters.reuse,links:true},
 {id:'atlas',scene:'end',anchor:'finale',length:1.4,eyebrow:'',title:'Explore who was studied, which conditions were investigated and how signals were measured.',paragraphs:[],note:'',action:true}
];
