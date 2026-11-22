(() => {
  const s = window.atlasStoryStats;
  const { reporting, prevalence } = window.atlasNarrative;
  const { criteria, access } = window.atlasAudit;
  const number = (value, digits = 0) => value == null ? 'unavailable' : value.toLocaleString('en', { maximumFractionDigits: digits });
  const percent = (count, denominator = s.total, digits = 0) => denominator ? number(100 * count / denominator, digits) + '%' : 'unavailable';
  const bold = value => '<strong>' + value + '</strong>';
  const share = (count, digits = 0) => bold(number(count) + ' (' + percent(count, s.total, digits) + ')');
  const years = Object.keys(s.years);
  const start = years[0], end = years.at(-1);
  const [sex, age, bmi, weight, height, , , thermalHistory, chronotype, sleep, ...rare] = reporting;
  const [healthy, history, medication, cardiovascular, smoking] = criteria;
  const [skin, heart, core] = prevalence;
  const sharing = access.records.length;
  const verified = access.records.filter(r => r.url).length;
  const unavailable = access.records.filter(r => r.intendedPublicUrl && !r.url).length;
  const notChecked = access.records.filter(r => r.reportedUrl && !r.url && !r.intendedPublicUrl).length;
  const missing = sharing - verified - unavailable - notChecked;
  const sankey = window.atlasSankeyData;
  const visibleSignals = new Set(window.atlasSignalDomains.flatMap(domain => domain.signals));
  const frequentSignals = new Set(sankey.signal_totals.filter(r => r.count >= 5 && visibleSignals.has(r.signal)).map(r => r.signal));
  const signalPairs = sankey.overall.filter(r => frequentSignals.has(r.signal));
  const methodLabels = new Set(signalPairs.map(r => r['physio-sensing-method']));
  const nOffice = s.types['Office/Workstations'] ?? 0;
  const count = setting => s.settings[setting] ?? 0;

  window.atlasStoryText = {
    dek: number(s.total) + ' indoor thermal-physiology experiments reported in journal articles published from ' + start + ' to ' + end + '.',
    hint: 'Scroll to follow ' + number(s.total) + ' experiments',
    growthTitle: number(s.total) + ' experiments, ' + start + '–' + end + '.',
    growthCaption: 'Circle area = sample size · n = ' + number(s.sample.count),
    geoTitle: number(s.countries) + ' countries and territories. ' + number(s.cities) + ' cities.',
    climateTitle: number(s.humid) + ' experiments in humid subtropical locations.',
    climateText: 'Humid subtropical locations accounted for ' + bold(percent(s.humid) + ' of experiments') +
      ' and ' + bold(percent(s.humidSampleSum, s.sampleSum) + ' of the sum of reported sample sizes') +
      '. ' + number(s.climateGroups) + ' named climate groups were represented.',
    thermalHistory: bold(number(thermalHistory.count) + ' of ' + number(s.total) + ' experiments (' + percent(thermalHistory.count) + ')'),
    chapters: {
      growth: [
        'The review included ' + bold(number(s.total) + ' experiments') + '. Annual counts were ' + bold(number(s.years[start]) + ' in ' + start) + ' and ' + bold(number(s.years[end]) + ' in ' + end) + '.',
        'Sample size was reported for ' + bold(number(s.sample.count) + ' experiments') + '. Their reported sample sizes totalled ' + bold(number(s.sampleSum)) + ', with a median of ' + bold(number(s.sample.median, 1) + ' per experiment') + '.',
      ],
      geography: [
        bold(number(s.china) + ' of ' + number(s.total) + ' experiments (' + percent(s.china) + ')') + ' were conducted in China.',
        'Coordinates were available for ' + bold(number(s.mapped) + ' experiments') + '.',
      ],
      participants: [
        'Mean age was available for ' + bold(number(s.age.count) + ' experiments') + '; the median of these means was ' + bold(number(s.age.median, 1) + ' years') + '.',
        'Mean BMI was available for ' + bold(number(s.bmi.count) + ' experiments') + '; the median of these means was ' + bold(number(s.bmi.median, 1) + ' kg/m²') + '.',
      ],
      reporting: [
        'Sex was reported in ' + share(sex.count) + ' experiments, age in ' + share(age.count) + ', BMI in ' + share(bmi.count) + ', weight in ' + share(weight.count) + ' and height in ' + share(height.count) + '.',
        'Chronotype was reported in ' + share(chronotype.count, 1) + ' experiments and regular sleep timing in ' + share(sleep.count, 1) +
          '. Other fields included ' + rare.map(r => r.label.toLowerCase() + ' ' + share(r.count, 1)).join(', ') + '.',
      ],
      profile: [
        'Generally healthy participants were required in ' + share(healthy.count) + ' experiments; thermal history was an eligibility criterion in ' + share(history.count) + '.',
        'Medication or ongoing treatment was an eligibility criterion in ' + share(medication.count) + ', cardiovascular or blood-pressure disease in ' + share(cardiovascular.count) + ', and smoking status in ' + share(smoking.count) + '.',
      ],
      setting: [
        share(count('Lab')) + ' experiments used laboratory settings, ' + share(count('Living Lab')) + ' living-laboratory settings and ' + share(count('Field')) +
          ' field settings. ' + number(count('Mixed')) + ' used mixed settings; ' + number(s.total - count('Lab') - count('Living Lab') - count('Field') - count('Mixed')) + ' lacked a classified setting.',
        'Office/workstation layouts were reported in ' + share(nOffice) + ' experiments. Among ' + bold(number(s.bothDescriptors) + ' experiments') + ' with both descriptors, ' + bold(number(s.officeLab)) + ' combined a laboratory setting with an office/workstation layout.',
      ],
      temperatures: [
        'Numeric temperature bounds were available for ' + bold(number(s.low.count) + ' experiments') + '. The median lower bound was ' + bold(number(s.low.median, 1) + ' °C') + '; the median upper bound was ' + bold(number(s.high.median, 1) + ' °C') + '.',
        'The middle 50% of lower bounds lay between ' + bold(number(s.low.q1, 1) + ' and ' + number(s.low.q3, 1) + ' °C') + '; the middle 50% of upper bounds lay between ' + bold(number(s.high.q1, 1) + ' and ' + number(s.high.q3, 1) + ' °C') + '.',
      ],
      signals: [
        'Skin temperature was measured in ' + share(skin.count) + ' experiments, heart/pulse rate in ' + share(heart.count) + ' and core/body temperature in ' + share(core.count) + '.',
        bold(number(frequentSignals.size) + ' signals') + ' shown in the figure were each measured in at least five experiments. They accounted for ' + bold(number(signalPairs.reduce((sum, row) => sum + row.count, 0)) + ' experiment–signal–method records') + ' and ' + bold(number(methodLabels.size) + ' sensing-method labels') + '.',
      ],
      reuse: [
        share(sharing) + ' experiments were coded as sharing data or code.',
        bold(number(verified) + ' public repository links were verified') + ' in the previous link audit. ' +
          number(missing) + ' lacked a repository URL, ' + number(unavailable) + ' had a link that was unavailable when checked, and ' + number(notChecked) + ' reported links await verification.',
      ],
    },
  };
})();
