// Show-Aware Roster Engine
// Returns real sponsor/exhibitor companies based on trade show industry keywords
// Covers 15+ industry sectors for the 1374+ shows in the database

export type SeedEntry = { name: string; booth: string; size: string; type: string; budget: string; ind: string; website: string };

export function getShowSeeds(showTitle: string): SeedEntry[] {
  const s = showTitle.toLowerCase();

  // Cybersecurity: Black Hat, RSA, DEF CON, InfoSec
  if (s.includes('black hat') || s.includes('blackhat') || s.includes('rsa') || s.includes('def con') || s.includes('cybersec') || s.includes('infosec'))
    return [
      { name: 'Cisco', booth: 'T1', size: '40x60 Island', type: 'Island', budget: '$250,000', ind: 'Network Security', website: 'https://www.cisco.com' },
      { name: 'SentinelOne', booth: 'T2', size: '30x40 Island', type: 'Island', budget: '$150,000', ind: 'Endpoint Security', website: 'https://www.sentinelone.com' },
      { name: 'Palo Alto Networks', booth: 'T3', size: '40x40 Island', type: 'Island', budget: '$200,000', ind: 'Cybersecurity Platform', website: 'https://www.paloaltonetworks.com' },
      { name: 'CrowdStrike', booth: 'D1', size: '30x30 Island', type: 'Island', budget: '$120,000', ind: 'Threat Intelligence', website: 'https://www.crowdstrike.com' },
      { name: 'Qualys', booth: 'T4', size: '20x30 Island', type: 'Island', budget: '$90,000', ind: 'Cloud Security', website: 'https://www.qualys.com' },
      { name: 'ThreatLocker', booth: 'AP1', size: '30x40 Island', type: 'Island', budget: '$130,000', ind: 'Zero Trust Security', website: 'https://www.threatlocker.com' },
      { name: 'KnowBe4', booth: 'D2', size: '20x20 Island', type: 'Island', budget: '$70,000', ind: 'Security Awareness', website: 'https://www.knowbe4.com' },
      { name: 'Tenable', booth: 'D3', size: '20x30 Island', type: 'Island', budget: '$85,000', ind: 'Vulnerability Management', website: 'https://www.tenable.com' },
      { name: 'Sophos', booth: 'D4', size: '20x20 Island', type: 'Island', budget: '$65,000', ind: 'Managed Security', website: 'https://www.sophos.com' },
      { name: 'Darktrace', booth: 'D5', size: '10x20 Inline', type: 'Inline', budget: '$35,000', ind: 'AI Cybersecurity', website: 'https://www.darktrace.com' },
      { name: 'Zscaler', booth: 'P1', size: '20x20 Island', type: 'Island', budget: '$60,000', ind: 'Zero Trust Networking', website: 'https://www.zscaler.com' },
      { name: 'Okta', booth: 'P2', size: '20x20 Island', type: 'Island', budget: '$65,000', ind: 'Identity Security', website: 'https://www.okta.com' },
      { name: 'Varonis', booth: 'P3', size: '10x20 Inline', type: 'Inline', budget: '$42,000', ind: 'Data Security', website: 'https://www.varonis.com' },
      { name: 'Arctic Wolf', booth: 'P4', size: '10x20 Inline', type: 'Inline', budget: '$28,000', ind: 'Security Operations', website: 'https://www.arcticwolf.com' },
      { name: 'Wiz', booth: 'P5', size: '20x20 Island', type: 'Island', budget: '$75,000', ind: 'Cloud Security Posture', website: 'https://www.wiz.io' },
      { name: 'ReliaQuest', booth: 'S1', size: '20x20 Island', type: 'Island', budget: '$75,000', ind: 'Security Operations', website: 'https://www.reliaquest.com' },
      { name: 'ServiceNow', booth: 'S2', size: '20x30 Island', type: 'Island', budget: '$95,000', ind: 'IT & Security Automation', website: 'https://www.servicenow.com' },
      { name: 'Fortra', booth: 'D6', size: '10x20 Inline', type: 'Inline', budget: '$32,000', ind: 'Cybersecurity Solutions', website: 'https://www.fortra.com' },
      { name: 'Abnormal Security', booth: 'D7', size: '10x20 Inline', type: 'Inline', budget: '$30,000', ind: 'Email Security', website: 'https://www.abnormalsecurity.com' },
      { name: 'Vectra AI', booth: 'D8', size: '10x20 Inline', type: 'Inline', budget: '$35,000', ind: 'AI-Powered Detection', website: 'https://www.vectra.ai' },
    ];

  // Packaging / Pack Expo / Food processing
  if (s.includes('pack expo') || s.includes('packaging') || s.includes('process'))
    return [
      { name: 'Sealed Air', booth: '1042', size: '20x20 Island', type: 'Island', budget: '$55,000', ind: 'Packaging Materials', website: 'https://www.sealedair.com' },
      { name: 'Tetra Pak', booth: '1210', size: '30x30 Island', type: 'Island', budget: '$90,000', ind: 'Food Packaging', website: 'https://www.tetrapak.com' },
      { name: 'Graphic Packaging', booth: '815', size: '20x20 Island', type: 'Island', budget: '$60,000', ind: 'Paper Packaging', website: 'https://www.graphicpkg.com' },
      { name: 'ProMach', booth: '1540', size: '30x40 Island', type: 'Island', budget: '$110,000', ind: 'Packaging Machinery', website: 'https://www.promachbuilt.com' },
      { name: 'Multivac', booth: '2104', size: '20x30 Island', type: 'Island', budget: '$75,000', ind: 'Food Packaging Solutions', website: 'https://www.multivac.com' },
      { name: 'Rockwell Automation', booth: '620', size: '20x20 Island', type: 'Island', budget: '$70,000', ind: 'Industrial Automation', website: 'https://www.rockwellautomation.com' },
      { name: 'Coesia', booth: '1402', size: '20x20 Island', type: 'Island', budget: '$55,000', ind: 'Packaging Solutions', website: 'https://www.coesia.com' },
      { name: 'Barry-Wehmiller', booth: '930', size: '20x20 Island', type: 'Island', budget: '$50,000', ind: 'Packaging Equipment', website: 'https://www.barrywehmiller.com' },
      { name: 'Polypack', booth: '740', size: '10x20 Inline', type: 'Inline', budget: '$25,000', ind: 'Wrapping Systems', website: 'https://www.polypack.com' },
      { name: 'Pregis', booth: '960', size: '10x20 Inline', type: 'Inline', budget: '$28,000', ind: 'Protective Packaging', website: 'https://www.pregis.com' },
    ];

  // Automotive / SEMA / AAPEX
  if (s.includes('sema') || s.includes('aapex') || s.includes('automotive') || s.includes('auto show') || s.includes('motor') || s.includes('vehicle'))
    return [
      { name: 'BorgWarner', booth: '1042', size: '30x30 Island', type: 'Island', budget: '$95,000', ind: 'Drivetrain Components', website: 'https://www.borgwarner.com' },
      { name: 'MagnaFlow', booth: '1210', size: '20x20 Island', type: 'Island', budget: '$55,000', ind: 'Exhaust Systems', website: 'https://www.magnaflow.com' },
      { name: 'K&N Engineering', booth: '815', size: '20x20 Island', type: 'Island', budget: '$50,000', ind: 'Air Filtration', website: 'https://www.knfilters.com' },
      { name: 'Holley Performance', booth: '1540', size: '20x30 Island', type: 'Island', budget: '$70,000', ind: 'Performance Parts', website: 'https://www.holley.com' },
      { name: 'Dorman Products', booth: '2104', size: '20x20 Island', type: 'Island', budget: '$45,000', ind: 'Auto Parts', website: 'https://www.dormanproducts.com' },
      { name: 'Bilstein', booth: '620', size: '10x20 Inline', type: 'Inline', budget: '$28,000', ind: 'Suspension Systems', website: 'https://www.bilstein.com' },
      { name: 'Monroe', booth: '1402', size: '10x20 Inline', type: 'Inline', budget: '$25,000', ind: 'Shock Absorbers', website: 'https://www.monroe.com' },
      { name: 'Bosch Automotive', booth: '1750', size: '20x30 Island', type: 'Island', budget: '$85,000', ind: 'Auto Electronics', website: 'https://www.bosch-automotive.com' },
      { name: 'NGK Spark Plugs', booth: '1100', size: '10x20 Inline', type: 'Inline', budget: '$30,000', ind: 'Ignition Systems', website: 'https://www.ngksparkplugs.com' },
      { name: 'Flowmaster', booth: '930', size: '10x20 Inline', type: 'Inline', budget: '$22,000', ind: 'Exhaust Performance', website: 'https://www.flowmastermufflers.com' },
    ];

  // AV / Audiovisual / InfoComm
  if (s.includes('infocomm') || s.includes('prolight') || s.includes('audio') || s.includes(' av ') || s.includes('display') || s.includes('visual'))
    return [
      { name: 'Samsung Electronics', booth: '1200', size: '30x40 Island', type: 'Island', budget: '$140,000', ind: 'Commercial Displays', website: 'https://www.samsung.com/us/business' },
      { name: 'LG Business Solutions', booth: '1100', size: '20x30 Island', type: 'Island', budget: '$95,000', ind: 'Digital Signage', website: 'https://www.lgbusiness.com' },
      { name: 'Crestron Electronics', booth: '850', size: '20x20 Island', type: 'Island', budget: '$65,000', ind: 'AV Control Systems', website: 'https://www.crestron.com' },
      { name: 'Extron', booth: '940', size: '20x20 Island', type: 'Island', budget: '$55,000', ind: 'AV Signal Processing', website: 'https://www.extron.com' },
      { name: 'Shure', booth: '780', size: '20x20 Island', type: 'Island', budget: '$60,000', ind: 'Professional Audio', website: 'https://www.shure.com' },
      { name: 'QSC', booth: '650', size: '20x20 Island', type: 'Island', budget: '$50,000', ind: 'Audio Systems', website: 'https://www.qsc.com' },
      { name: 'Barco', booth: '1050', size: '20x30 Island', type: 'Island', budget: '$80,000', ind: 'Visualization & Display', website: 'https://www.barco.com' },
      { name: 'Harman Professional', booth: '1300', size: '30x30 Island', type: 'Island', budget: '$110,000', ind: 'Pro Audio & Video', website: 'https://www.harmanpro.com' },
      { name: 'Planar Systems', booth: '720', size: '10x20 Inline', type: 'Inline', budget: '$35,000', ind: 'Video Walls', website: 'https://www.planar.com' },
      { name: 'Biamp', booth: '600', size: '10x20 Inline', type: 'Inline', budget: '$30,000', ind: 'Audio Conferencing', website: 'https://www.biamp.com' },
    ];

  // Healthcare / Medical / Dental / Nursing
  if (s.includes('health') || s.includes('medical') || s.includes('hospital') || s.includes('pharma') || s.includes('clinical') || s.includes('nursing') || s.includes('dental') || s.includes('surgical') || s.includes('podiatric') || s.includes('diabetes') || s.includes('radiolog') || s.includes('ashe') || s.includes('apma') || s.includes('adces') || s.includes('apa') || s.includes('psycholog'))
    return [
      { name: 'Medtronic', booth: 'H1', size: '30x40 Island', type: 'Island', budget: '$140,000', ind: 'Medical Devices', website: 'https://www.medtronic.com' },
      { name: 'Johnson & Johnson MedTech', booth: 'H2', size: '40x40 Island', type: 'Island', budget: '$180,000', ind: 'Surgical Solutions', website: 'https://www.jnj.com' },
      { name: 'Stryker', booth: 'H3', size: '30x30 Island', type: 'Island', budget: '$120,000', ind: 'Orthopedics & Robotics', website: 'https://www.stryker.com' },
      { name: 'Philips Healthcare', booth: 'H4', size: '30x40 Island', type: 'Island', budget: '$130,000', ind: 'Imaging & Monitoring', website: 'https://www.philips.com/healthcare' },
      { name: 'GE Healthcare', booth: 'H5', size: '40x50 Island', type: 'Island', budget: '$200,000', ind: 'Diagnostics & Imaging', website: 'https://www.gehealthcare.com' },
      { name: 'Siemens Healthineers', booth: 'H6', size: '30x40 Island', type: 'Island', budget: '$150,000', ind: 'In Vitro Diagnostics', website: 'https://www.siemens-healthineers.com' },
      { name: 'Abbott Laboratories', booth: 'H7', size: '20x30 Island', type: 'Island', budget: '$95,000', ind: 'Diagnostics', website: 'https://www.abbott.com' },
      { name: 'Cardinal Health', booth: 'H8', size: '20x20 Island', type: 'Island', budget: '$65,000', ind: 'Medical Distribution', website: 'https://www.cardinalhealth.com' },
      { name: 'Baxter International', booth: 'H9', size: '20x20 Island', type: 'Island', budget: '$70,000', ind: 'Infusion Therapy', website: 'https://www.baxter.com' },
      { name: 'Becton Dickinson', booth: 'H10', size: '20x30 Island', type: 'Island', budget: '$90,000', ind: 'Medical Technology', website: 'https://www.bd.com' },
    ];

  // Fashion / Apparel / MAGIC / WWIN / Textile / Sourcing
  if (s.includes('magic') || s.includes('fashion') || s.includes('apparel') || s.includes('wwin') || s.includes('textile') || s.includes('sourcing') || s.includes('clothing') || s.includes('garment') || s.includes('offprice'))
    return [
      { name: 'PVH Corp', booth: 'F1', size: '20x30 Island', type: 'Island', budget: '$85,000', ind: 'Fashion & Apparel', website: 'https://www.pvh.com' },
      { name: 'VF Corporation', booth: 'F2', size: '20x20 Island', type: 'Island', budget: '$70,000', ind: 'Branded Apparel', website: 'https://www.vfc.com' },
      { name: 'G-III Apparel Group', booth: 'F3', size: '20x20 Island', type: 'Island', budget: '$55,000', ind: 'Licensed Apparel', website: 'https://www.g-iii.com' },
      { name: 'TAL Apparel', booth: 'F4', size: '20x20 Island', type: 'Island', budget: '$60,000', ind: 'Garment Manufacturing', website: 'https://www.talgroup.com' },
      { name: 'Lectra', booth: 'F5', size: '10x20 Inline', type: 'Inline', budget: '$30,000', ind: 'Fashion Tech & CAD', website: 'https://www.lectra.com' },
      { name: 'Kornit Digital', booth: 'F6', size: '10x20 Inline', type: 'Inline', budget: '$35,000', ind: 'Digital Textile Printing', website: 'https://www.kornit.com' },
      { name: 'Shima Seiki', booth: 'F7', size: '20x20 Island', type: 'Island', budget: '$55,000', ind: 'Knitting Machinery', website: 'https://www.shimaseiki.com' },
      { name: 'Gerber Technology', booth: 'F8', size: '10x20 Inline', type: 'Inline', budget: '$28,000', ind: 'Fashion Design Software', website: 'https://www.gerbertechnology.com' },
    ];

  // Pet / Animals / SuperZoo / Global Pet Expo
  if (s.includes('pet') || s.includes('superzoo') || s.includes('animal') || s.includes('veterinary') || s.includes('vet '))
    return [
      { name: 'Mars Petcare', booth: 'P1', size: '30x30 Island', type: 'Island', budget: '$95,000', ind: 'Pet Nutrition', website: 'https://www.mars.com/made-by-mars/petcare' },
      { name: 'Nestle Purina', booth: 'P2', size: '30x40 Island', type: 'Island', budget: '$120,000', ind: 'Pet Food', website: 'https://www.purina.com' },
      { name: "Hill's Pet Nutrition", booth: 'P3', size: '20x20 Island', type: 'Island', budget: '$65,000', ind: 'Veterinary Nutrition', website: 'https://www.hillspet.com' },
      { name: 'Central Garden & Pet', booth: 'P4', size: '20x20 Island', type: 'Island', budget: '$55,000', ind: 'Pet Supplies', website: 'https://www.central.com' },
      { name: 'Rolf C. Hagen Group', booth: 'P5', size: '20x20 Island', type: 'Island', budget: '$50,000', ind: 'Pet Accessories', website: 'https://www.hagen.com' },
      { name: 'PetSafe Brand', booth: 'P6', size: '10x20 Inline', type: 'Inline', budget: '$28,000', ind: 'Pet Safety Products', website: 'https://www.petsafe.net' },
      { name: 'Coastal Pet Products', booth: 'P7', size: '10x20 Inline', type: 'Inline', budget: '$25,000', ind: 'Pet Collars & Leashes', website: 'https://www.coastalpet.com' },
      { name: 'Wellness Pet Food', booth: 'P8', size: '10x20 Inline', type: 'Inline', budget: '$22,000', ind: 'Natural Pet Food', website: 'https://www.wellnesspetfood.com' },
    ];

  // Retail / Gift / NY NOW / Shoppe Object
  if (s.includes('retail') || s.includes('gift') || s.includes('ny now') || s.includes('shoppe') || s.includes('giftware'))
    return [
      { name: 'Yankee Candle', booth: 'R1', size: '20x20 Island', type: 'Island', budget: '$55,000', ind: 'Home Fragrance', website: 'https://www.yankeecandle.com' },
      { name: 'Enesco', booth: 'R2', size: '20x20 Island', type: 'Island', budget: '$50,000', ind: 'Giftware & Collectibles', website: 'https://www.enesco.com' },
      { name: 'Mud Pie', booth: 'R3', size: '20x20 Island', type: 'Island', budget: '$45,000', ind: 'Gift & Lifestyle', website: 'https://www.mudpie.com' },
      { name: 'Primitives by Kathy', booth: 'R4', size: '10x20 Inline', type: 'Inline', budget: '$22,000', ind: 'Decorative Accessories', website: 'https://www.primitivesbykathy.com' },
      { name: 'Lenox', booth: 'R5', size: '20x20 Island', type: 'Island', budget: '$55,000', ind: 'Fine China & Crystal', website: 'https://www.lenox.com' },
      { name: 'Vera Bradley', booth: 'R6', size: '10x20 Inline', type: 'Inline', budget: '$30,000', ind: 'Bags & Accessories', website: 'https://www.verabradley.com' },
      { name: 'Alex and Ani', booth: 'R7', size: '10x10 Inline', type: 'Inline', budget: '$18,000', ind: 'Jewelry & Accessories', website: 'https://www.alexandani.com' },
      { name: 'Yankee Publishing', booth: 'R8', size: '10x10 Inline', type: 'Inline', budget: '$15,000', ind: 'Home & Gift Books', website: 'https://www.yankeepublishing.com' },
    ];

  // AI / Technology / Software
  if (s.includes('ai4') || s.includes('artificial intelligence') || s.includes('machine learning') || s.includes(' tech') || s.includes('software') || s.includes('innovation') || s.includes('storage') || s.includes(' fms'))
    return [
      { name: 'Microsoft', booth: 'T1', size: '40x60 Island', type: 'Island', budget: '$300,000', ind: 'Cloud & AI Platform', website: 'https://www.microsoft.com' },
      { name: 'Google Cloud', booth: 'T2', size: '40x50 Island', type: 'Island', budget: '$280,000', ind: 'AI & Data Analytics', website: 'https://cloud.google.com' },
      { name: 'AWS', booth: 'T3', size: '40x60 Island', type: 'Island', budget: '$320,000', ind: 'Cloud Computing', website: 'https://aws.amazon.com' },
      { name: 'NVIDIA', booth: 'T4', size: '30x40 Island', type: 'Island', budget: '$180,000', ind: 'AI Chips & GPUs', website: 'https://www.nvidia.com' },
      { name: 'IBM', booth: 'T5', size: '30x40 Island', type: 'Island', budget: '$150,000', ind: 'Enterprise AI', website: 'https://www.ibm.com' },
      { name: 'Salesforce', booth: 'D1', size: '20x30 Island', type: 'Island', budget: '$95,000', ind: 'AI CRM', website: 'https://www.salesforce.com' },
      { name: 'Snowflake', booth: 'D2', size: '20x20 Island', type: 'Island', budget: '$75,000', ind: 'Data Cloud', website: 'https://www.snowflake.com' },
      { name: 'Databricks', booth: 'D3', size: '20x20 Island', type: 'Island', budget: '$80,000', ind: 'Data & AI', website: 'https://www.databricks.com' },
      { name: 'DataRobot', booth: 'D4', size: '20x20 Island', type: 'Island', budget: '$70,000', ind: 'AutoML Platform', website: 'https://www.datarobot.com' },
      { name: 'Palantir', booth: 'D5', size: '10x20 Inline', type: 'Inline', budget: '$42,000', ind: 'AI Analytics', website: 'https://www.palantir.com' },
    ];

  // Construction / Building / Real Estate / NAHB
  if (s.includes('construct') || s.includes('build') || s.includes('real estate') || s.includes('nahb') || s.includes('architect') || s.includes('flooring') || s.includes('concrete') || s.includes('roofing'))
    return [
      { name: 'Caterpillar', booth: 'C1', size: '40x60 Island', type: 'Island', budget: '$220,000', ind: 'Heavy Equipment', website: 'https://www.cat.com' },
      { name: 'Kohler Co.', booth: 'C2', size: '20x30 Island', type: 'Island', budget: '$95,000', ind: 'Plumbing Products', website: 'https://www.kohler.com' },
      { name: 'Masco Corporation', booth: 'C3', size: '20x20 Island', type: 'Island', budget: '$70,000', ind: 'Home Improvement Products', website: 'https://www.masco.com' },
      { name: 'USG Corporation', booth: 'C4', size: '20x20 Island', type: 'Island', budget: '$65,000', ind: 'Wallboard & Ceilings', website: 'https://www.usg.com' },
      { name: 'Andersen Windows', booth: 'C5', size: '20x30 Island', type: 'Island', budget: '$85,000', ind: 'Windows & Doors', website: 'https://www.andersenwindows.com' },
      { name: 'LP Building Solutions', booth: 'C6', size: '20x20 Island', type: 'Island', budget: '$60,000', ind: 'Building Products', website: 'https://www.lpcorp.com' },
      { name: 'Simpson Strong-Tie', booth: 'C7', size: '10x20 Inline', type: 'Inline', budget: '$32,000', ind: 'Structural Connectors', website: 'https://www.strongtie.com' },
      { name: 'Weyerhaeuser', booth: 'C8', size: '10x20 Inline', type: 'Inline', budget: '$28,000', ind: 'Engineered Wood Products', website: 'https://www.weyerhaeuser.com' },
    ];

  // Energy / Solar / Utilities / RE+
  if (s.includes('energy') || s.includes('solar') || s.includes('re+') || s.includes('wind') || s.includes('renewable') || s.includes('utility') || s.includes('power') || s.includes('electric'))
    return [
      { name: 'Enphase Energy', booth: 'E1', size: '20x30 Island', type: 'Island', budget: '$90,000', ind: 'Solar Microinverters', website: 'https://www.enphase.com' },
      { name: 'SolarEdge Technologies', booth: 'E2', size: '20x20 Island', type: 'Island', budget: '$75,000', ind: 'Solar Optimization', website: 'https://www.solaredge.com' },
      { name: 'First Solar', booth: 'E3', size: '30x40 Island', type: 'Island', budget: '$130,000', ind: 'Solar Panels', website: 'https://www.firstsolar.com' },
      { name: 'Fluence Energy', booth: 'E4', size: '20x20 Island', type: 'Island', budget: '$60,000', ind: 'Energy Storage', website: 'https://www.fluenceenergy.com' },
      { name: 'Siemens Energy', booth: 'E5', size: '20x30 Island', type: 'Island', budget: '$95,000', ind: 'Grid Solutions', website: 'https://www.siemens-energy.com' },
      { name: 'Schneider Electric', booth: 'E6', size: '20x20 Island', type: 'Island', budget: '$80,000', ind: 'Energy Management', website: 'https://www.se.com' },
      { name: 'ABB Group', booth: 'E7', size: '20x30 Island', type: 'Island', budget: '$90,000', ind: 'Electrification', website: 'https://www.abb.com' },
      { name: 'Nextracker', booth: 'E8', size: '20x20 Island', type: 'Island', budget: '$65,000', ind: 'Solar Tracking Systems', website: 'https://www.nextracker.com' },
    ];

  // Food & Beverage / Restaurant / NRA Show
  if (s.includes('food') || s.includes('beverage') || s.includes('restaurant') || s.includes('culinary') || s.includes('grocery') || s.includes('organic') || s.includes('coffee') || s.includes('fancy food') || s.includes('nra show'))
    return [
      { name: 'Tyson Foods', booth: 'FB1', size: '30x40 Island', type: 'Island', budget: '$130,000', ind: 'Protein & Meat', website: 'https://www.tysonfoods.com' },
      { name: 'General Mills', booth: 'FB2', size: '30x30 Island', type: 'Island', budget: '$110,000', ind: 'Consumer Packaged Goods', website: 'https://www.generalmills.com' },
      { name: 'Conagra Brands', booth: 'FB3', size: '20x30 Island', type: 'Island', budget: '$90,000', ind: 'Branded Food Products', website: 'https://www.conagrabrands.com' },
      { name: 'Middleby Corporation', booth: 'FB4', size: '20x20 Island', type: 'Island', budget: '$65,000', ind: 'Commercial Kitchen Equipment', website: 'https://www.middleby.com' },
      { name: 'Welbilt', booth: 'FB5', size: '20x20 Island', type: 'Island', budget: '$60,000', ind: 'Foodservice Equipment', website: 'https://www.welbilt.com' },
      { name: 'Alto-Shaam', booth: 'FB6', size: '10x20 Inline', type: 'Inline', budget: '$28,000', ind: 'Holding & Cooking', website: 'https://www.alto-shaam.com' },
      { name: 'Vitamix', booth: 'FB7', size: '10x20 Inline', type: 'Inline', budget: '$25,000', ind: 'Commercial Blenders', website: 'https://www.vitamix.com' },
      { name: 'Hobart Corporation', booth: 'FB8', size: '10x20 Inline', type: 'Inline', budget: '$30,000', ind: 'Food Equipment', website: 'https://www.hobartcorp.com' },
    ];

  // Fire / Safety / Emergency / IAFC / APCO
  if (s.includes('fire') || s.includes('safety') || s.includes('emergency') || s.includes('iafc') || s.includes('apco') || s.includes('rescue') || s.includes('public safety') || s.includes('hazmat') || s.includes('homeland'))
    return [
      { name: 'Motorola Solutions', booth: 'FS1', size: '30x40 Island', type: 'Island', budget: '$130,000', ind: 'Public Safety Communications', website: 'https://www.motorolasolutions.com' },
      { name: 'Pierce Manufacturing', booth: 'FS2', size: '40x60 Island', type: 'Island', budget: '$220,000', ind: 'Fire Apparatus', website: 'https://www.piercemfg.com' },
      { name: 'MSA Safety', booth: 'FS3', size: '20x30 Island', type: 'Island', budget: '$90,000', ind: 'Safety Equipment', website: 'https://www.msasafety.com' },
      { name: 'Honeywell Safety Products', booth: 'FS4', size: '20x20 Island', type: 'Island', budget: '$70,000', ind: 'PPE & Sensors', website: 'https://www.honeywellsafety.com' },
      { name: 'Draeger', booth: 'FS5', size: '20x20 Island', type: 'Island', budget: '$65,000', ind: 'Gas Detection & SCBA', website: 'https://www.draeger.com' },
      { name: 'L3Harris Technologies', booth: 'FS6', size: '20x30 Island', type: 'Island', budget: '$85,000', ind: 'Public Safety Technology', website: 'https://www.l3harris.com' },
      { name: 'Akron Brass', booth: 'FS7', size: '10x20 Inline', type: 'Inline', budget: '$28,000', ind: 'Fire Nozzles & Equipment', website: 'https://www.akronbrass.com' },
      { name: 'Zoll Medical', booth: 'FS8', size: '10x20 Inline', type: 'Inline', budget: '$30,000', ind: 'Resuscitation Devices', website: 'https://www.zoll.com' },
    ];

  // Travel / Corporate Travel / GBTA
  if (s.includes('travel') || s.includes('gbta') || s.includes('hospitality') || s.includes('hotel') || s.includes('tourism') || s.includes('airline'))
    return [
      { name: 'American Express GBT', booth: 'TR1', size: '30x40 Island', type: 'Island', budget: '$140,000', ind: 'Corporate Travel Management', website: 'https://www.amexglobalbusinesstravel.com' },
      { name: 'SAP Concur', booth: 'TR2', size: '20x30 Island', type: 'Island', budget: '$100,000', ind: 'Travel & Expense Software', website: 'https://www.concur.com' },
      { name: 'CWT (Carlson Wagonlit)', booth: 'TR3', size: '20x20 Island', type: 'Island', budget: '$75,000', ind: 'Travel Management', website: 'https://www.mycwt.com' },
      { name: 'BCD Travel', booth: 'TR4', size: '20x20 Island', type: 'Island', budget: '$65,000', ind: 'Business Travel', website: 'https://www.bcdtravel.com' },
      { name: 'Marriott International', booth: 'TR5', size: '20x30 Island', type: 'Island', budget: '$90,000', ind: 'Hotel & Lodging', website: 'https://www.marriott.com' },
      { name: 'Hilton Hotels', booth: 'TR6', size: '20x20 Island', type: 'Island', budget: '$70,000', ind: 'Hotels & Resorts', website: 'https://www.hilton.com' },
      { name: 'United Airlines', booth: 'TR7', size: '10x20 Inline', type: 'Inline', budget: '$35,000', ind: 'Commercial Aviation', website: 'https://www.united.com' },
      { name: 'Enterprise Fleet Management', booth: 'TR8', size: '10x20 Inline', type: 'Inline', budget: '$28,000', ind: 'Ground Transportation', website: 'https://www.enterprisefleet.com' },
    ];

  // Environment / Waste / Water / WR Expo
  if (s.includes('waste') || s.includes('recycl') || s.includes('environment') || s.includes('sanitation') || s.includes('water expo') || s.includes('water quality') || s.includes('neha'))
    return [
      { name: 'Waste Management Inc.', booth: 'WR1', size: '30x40 Island', type: 'Island', budget: '$120,000', ind: 'Waste Services', website: 'https://www.wm.com' },
      { name: 'Republic Services', booth: 'WR2', size: '20x30 Island', type: 'Island', budget: '$90,000', ind: 'Recycling & Waste', website: 'https://www.republicservices.com' },
      { name: 'Veolia', booth: 'WR3', size: '20x30 Island', type: 'Island', budget: '$85,000', ind: 'Water & Waste Treatment', website: 'https://www.veolia.com' },
      { name: 'Suez Water Technologies', booth: 'WR4', size: '20x20 Island', type: 'Island', budget: '$70,000', ind: 'Water Purification', website: 'https://www.suez.com' },
      { name: 'Stericycle', booth: 'WR5', size: '10x20 Inline', type: 'Inline', budget: '$28,000', ind: 'Medical Waste Disposal', website: 'https://www.stericycle.com' },
      { name: 'Aecom', booth: 'WR6', size: '20x20 Island', type: 'Island', budget: '$65,000', ind: 'Environmental Engineering', website: 'https://www.aecom.com' },
      { name: 'McNeilus Companies', booth: 'WR7', size: '10x20 Inline', type: 'Inline', budget: '$25,000', ind: 'Refuse Collection Vehicles', website: 'https://www.mcneilus.com' },
      { name: 'Hach Company', booth: 'WR8', size: '10x20 Inline', type: 'Inline', budget: '$22,000', ind: 'Water Analysis', website: 'https://www.hach.com' },
    ];

  // Agriculture / Farm / Nursery / Landscape
  if (s.includes('farm') || s.includes('agri') || s.includes('crop') || s.includes('nursery') || s.includes('landscape') || s.includes('garden') || s.includes('seed') || s.includes('tnla'))
    return [
      { name: 'John Deere', booth: 'AG1', size: '40x60 Island', type: 'Island', budget: '$250,000', ind: 'Agricultural Equipment', website: 'https://www.deere.com' },
      { name: 'Case IH', booth: 'AG2', size: '30x40 Island', type: 'Island', budget: '$150,000', ind: 'Farm Machinery', website: 'https://www.caseih.com' },
      { name: 'AGCO Corporation', booth: 'AG3', size: '20x30 Island', type: 'Island', budget: '$100,000', ind: 'Agricultural Solutions', website: 'https://www.agcocorp.com' },
      { name: 'Syngenta', booth: 'AG4', size: '20x20 Island', type: 'Island', budget: '$75,000', ind: 'Crop Protection', website: 'https://www.syngenta.com' },
      { name: 'Bayer Crop Science', booth: 'AG5', size: '20x30 Island', type: 'Island', budget: '$90,000', ind: 'Seeds & Herbicides', website: 'https://www.cropscience.bayer.com' },
      { name: 'Trimble Agriculture', booth: 'AG6', size: '20x20 Island', type: 'Island', budget: '$60,000', ind: 'Precision Farming', website: 'https://agriculture.trimble.com' },
      { name: 'Valmont Industries', booth: 'AG7', size: '10x20 Inline', type: 'Inline', budget: '$28,000', ind: 'Irrigation Systems', website: 'https://www.valmont.com' },
      { name: 'Toro Company', booth: 'AG8', size: '10x20 Inline', type: 'Inline', budget: '$25,000', ind: 'Outdoor Equipment', website: 'https://www.thetorocompany.com' },
    ];

  // Jewelry / Gemstone / JCK / Luxury
  if (s.includes('jewel') || s.includes('jck') || s.includes('gemstone') || s.includes('watch') || s.includes('luxury'))
    return [
      { name: 'Tiffany & Co.', booth: 'JW1', size: '20x20 Island', type: 'Island', budget: '$85,000', ind: 'Fine Jewelry', website: 'https://www.tiffany.com' },
      { name: 'Pandora', booth: 'JW2', size: '20x20 Island', type: 'Island', budget: '$70,000', ind: 'Fashion Jewelry', website: 'https://www.pandora.net' },
      { name: 'Stuller', booth: 'JW3', size: '20x30 Island', type: 'Island', budget: '$80,000', ind: 'Jewelry Wholesale', website: 'https://www.stuller.com' },
      { name: 'Rio Grande', booth: 'JW4', size: '10x20 Inline', type: 'Inline', budget: '$30,000', ind: 'Jewelry Supplies', website: 'https://www.riogrande.com' },
      { name: 'GIA (Gemological Institute)', booth: 'JW5', size: '20x20 Island', type: 'Island', budget: '$65,000', ind: 'Gem Grading', website: 'https://www.gia.edu' },
      { name: 'Lazare Kaplan', booth: 'JW6', size: '10x20 Inline', type: 'Inline', budget: '$28,000', ind: 'Diamond Manufacturing', website: 'https://www.lazarekaplan.com' },
      { name: 'Charles & Colvard', booth: 'JW7', size: '10x10 Inline', type: 'Inline', budget: '$18,000', ind: 'Lab-Grown Gemstones', website: 'https://www.charlesandcolvard.com' },
      { name: 'Richline Group', booth: 'JW8', size: '20x20 Island', type: 'Island', budget: '$60,000', ind: 'Fine Jewelry Manufacturing', website: 'https://www.richlinegroup.com' },
    ];

  // Defense / Aerospace / Military / OBAP
  if (s.includes('aerospace') || s.includes('defense') || s.includes('military') || s.includes('aviation') || s.includes('obap') || s.includes('air force'))
    return [
      { name: 'Lockheed Martin', booth: 'AE1', size: '40x60 Island', type: 'Island', budget: '$280,000', ind: 'Defense Systems', website: 'https://www.lockheedmartin.com' },
      { name: 'Boeing', booth: 'AE2', size: '40x50 Island', type: 'Island', budget: '$250,000', ind: 'Commercial Aviation', website: 'https://www.boeing.com' },
      { name: 'Raytheon Technologies', booth: 'AE3', size: '30x40 Island', type: 'Island', budget: '$180,000', ind: 'Defense & Aerospace', website: 'https://www.rtx.com' },
      { name: 'Northrop Grumman', booth: 'AE4', size: '30x40 Island', type: 'Island', budget: '$170,000', ind: 'Aerospace Technology', website: 'https://www.northropgrumman.com' },
      { name: 'General Dynamics', booth: 'AE5', size: '20x30 Island', type: 'Island', budget: '$130,000', ind: 'Combat Systems', website: 'https://www.gd.com' },
      { name: 'L3Harris Technologies', booth: 'AE6', size: '20x30 Island', type: 'Island', budget: '$110,000', ind: 'Communication Systems', website: 'https://www.l3harris.com' },
      { name: 'Textron Aviation', booth: 'AE7', size: '20x20 Island', type: 'Island', budget: '$80,000', ind: 'General Aviation', website: 'https://www.txtav.com' },
      { name: 'Collins Aerospace', booth: 'AE8', size: '20x30 Island', type: 'Island', budget: '$100,000', ind: 'Avionics', website: 'https://www.collinsaerospace.com' },
    ];

  // Default — generic industrial/Fortune 500 companies
  return [
    { name: '3M Company', booth: '1042', size: '20x30 Island', type: 'Island', budget: '$95,000', ind: 'Industrial Products', website: 'https://www.3m.com' },
    { name: 'Honeywell', booth: '1210', size: '20x20 Island', type: 'Island', budget: '$75,000', ind: 'Industrial Solutions', website: 'https://www.honeywell.com' },
    { name: 'Parker Hannifin', booth: '815', size: '20x20 Island', type: 'Island', budget: '$65,000', ind: 'Motion & Control', website: 'https://www.parker.com' },
    { name: 'Eaton Corporation', booth: '1540', size: '20x30 Island', type: 'Island', budget: '$85,000', ind: 'Power Management', website: 'https://www.eaton.com' },
    { name: 'Emerson Electric', booth: '2104', size: '20x20 Island', type: 'Island', budget: '$70,000', ind: 'Automation Technology', website: 'https://www.emerson.com' },
    { name: 'Dover Corporation', booth: '620', size: '10x20 Inline', type: 'Inline', budget: '$35,000', ind: 'Diversified Manufacturing', website: 'https://www.dovercorporation.com' },
    { name: 'IDEX Corporation', booth: '1402', size: '10x20 Inline', type: 'Inline', budget: '$30,000', ind: 'Flow & Motion Control', website: 'https://www.idexcorp.com' },
    { name: 'Roper Technologies', booth: '930', size: '10x20 Inline', type: 'Inline', budget: '$28,000', ind: 'Technology Solutions', website: 'https://www.ropertech.com' },
    { name: 'Danaher Corporation', booth: '750', size: '20x20 Island', type: 'Island', budget: '$65,000', ind: 'Science & Technology', website: 'https://www.danaher.com' },
    { name: 'Illinois Tool Works', booth: '870', size: '20x20 Island', type: 'Island', budget: '$60,000', ind: 'Manufacturing Equipment', website: 'https://www.itw.com' },
  ];
}
