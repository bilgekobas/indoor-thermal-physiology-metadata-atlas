"""
Hand-built city coordinate lookup for the geographic map.

No live geocoding is available in this environment, so every coordinate
below was entered from known reference points and should be treated as
accurate to city-center precision (a few km), which is more than sufficient
for a world/regional map at this scale.

Key format: the exact `id-city` string as it appears in the corpus (after
.strip()), mapped to (lat, lon, resolved_name, precision).

`precision` is one of:
  - 'city'      — a specific named city/town
  - 'province'  — only a province/state was given; coordinates are that
                   province's capital or largest city, NOT the actual site
  - 'institute' — the raw value was an institution name, not a place name;
                   resolved to that institution's host city
  - 'multi'     — the raw field lists multiple cities for one study (split
                   into separate points, all sharing the same study id)

Known data-quality issues handled here, not silently:
  - 'Naogoya' is a typo for Nagoya (confirmed by no other Japanese city of
    that spelling existing, and the study context matching Nagoya-area work)
  - 'Tsinghua' resolves to Beijing (Tsinghua University's home city)
  - 'Teresina, Piaui, Petrolina, Pernambuco, Joao Pessoa, Paraiba, Manaus,
    Amazonas' is one study spanning four Brazilian cities — represented as
    4 separate points sharing study id 153_1
  - Province/state-only entries (Hunan, Guangdong, Anhui, Shaanxi, Jiangsu,
    California, Washington, Virginia, North Dakota, Paraiba) are placed at
    that province/state's capital or largest city, flagged 'province'
"""

CITY_COORDS = {
    # China
    'Changsha': (28.2278, 112.9388, 'Changsha', 'city'),
    'Chongqing': (29.5630, 106.5516, 'Chongqing', 'city'),
    "Xi'an": (34.3416, 108.9398, "Xi'an", 'city'),
    'Shanghai': (31.2304, 121.4737, 'Shanghai', 'city'),
    'Qingdao': (36.0671, 120.3826, 'Qingdao', 'city'),
    'Beijing': (39.9042, 116.4074, 'Beijing', 'city'),
    'Guangzhou': (23.1291, 113.2644, 'Guangzhou', 'city'),
    'Harbin': (45.8038, 126.5350, 'Harbin', 'city'),
    'Nanjing': (32.0603, 118.7969, 'Nanjing', 'city'),
    'Dalian': (38.9140, 121.6147, 'Dalian', 'city'),
    'Xiangtan': (27.8293, 112.9445, 'Xiangtan', 'city'),
    'Tianjin': (39.3434, 117.3616, 'Tianjin', 'city'),
    'Zhengzhou': (34.7466, 113.6253, 'Zhengzhou', 'city'),
    'Wuhan': (30.5928, 114.3055, 'Wuhan', 'city'),
    'Qiqihaer': (47.3543, 123.9180, 'Qiqihar', 'city'),
    'Hefei': (31.8206, 117.2272, 'Hefei', 'city'),
    'Kowloon': (22.3193, 114.1694, 'Kowloon, Hong Kong', 'city'),
    'Tsinghua': (39.9999, 116.3261, 'Beijing (Tsinghua University)', 'institute'),
    'Hunan': (28.2278, 112.9388, 'Changsha (Hunan province capital)', 'province'),
    'Guangdong': (23.1291, 113.2644, 'Guangzhou (Guangdong province capital)', 'province'),
    'Anhui': (31.8206, 117.2272, 'Hefei (Anhui province capital)', 'province'),
    'Shaanxi': (34.3416, 108.9398, "Xi'an (Shaanxi province capital)", 'province'),
    'Jiangsu': (32.0603, 118.7969, 'Nanjing (Jiangsu province capital)', 'province'),

    # South Korea
    'Seoul': (37.5665, 126.9780, 'Seoul', 'city'),
    'Incheon': (37.4563, 126.7052, 'Incheon', 'city'),
    'Daegu': (35.8714, 128.6014, 'Daegu', 'city'),

    # USA
    'Los Angeles': (34.0522, -118.2437, 'Los Angeles', 'city'),
    'Berkeley': (37.8715, -122.2730, 'Berkeley', 'city'),
    'Ann Arbor': (42.2808, -83.7430, 'Ann Arbor', 'city'),
    'Southfield': (42.4734, -83.2219, 'Southfield', 'city'),
    'Eugene': (44.0521, -123.0868, 'Eugene', 'city'),
    'West Lafayette': (40.4259, -86.9081, 'West Lafayette', 'city'),
    'California': (38.5767, -121.4934, 'Sacramento (California, state-level only)', 'province'),
    'Washington': (47.0379, -122.9007, 'Olympia (Washington state, state-level only)', 'province'),
    'Virginia': (37.5407, -77.4360, 'Richmond (Virginia, state-level only)', 'province'),
    'North Dakota': (46.8083, -100.7837, 'Bismarck (North Dakota, state-level only)', 'province'),

    # Japan
    'Aichi': (35.1802, 137.0000, 'Nagoya (Aichi prefecture)', 'province'),
    'Tokyo': (35.6762, 139.6503, 'Tokyo', 'city'),
    'Fukuoka': (33.5904, 130.4017, 'Fukuoka', 'city'),
    'Toyohashi': (34.7692, 137.3917, 'Toyohashi', 'city'),
    'Osaka': (34.6937, 135.5023, 'Osaka', 'city'),
    'Kanagawa': (35.4475, 139.6425, 'Yokohama (Kanagawa prefecture)', 'province'),
    'Meijo': (35.1568, 136.9776, 'Nagoya (Meijo University)', 'institute'),
    'Naogoya': (35.1815, 136.9066, 'Nagoya (corpus spelling: "Naogoya")', 'city'),

    # Singapore
    'Singapore': (1.3521, 103.8198, 'Singapore', 'city'),
    'Queenstown': (1.2942, 103.8030, 'Queenstown, Singapore', 'city'),

    # Taiwan
    'Kaohsiung': (22.6273, 120.3014, 'Kaohsiung', 'city'),
    'Taipei': (25.0330, 121.5654, 'Taipei', 'city'),

    # India
    'Bangalore': (12.9716, 77.5946, 'Bangalore', 'city'),

    # Malaysia
    'Serdang': (2.9928, 101.7066, 'Serdang', 'city'),

    # Australia
    'Sydney': (-33.8688, 151.2093, 'Sydney', 'city'),

    # Denmark
    'Lyngby': (55.7704, 12.5021, 'Kongens Lyngby', 'city'),
    'Copenhagen': (55.6761, 12.5683, 'Copenhagen', 'city'),

    # Italy
    'Perugia': (43.1107, 12.3908, 'Perugia', 'city'),
    'Ancona': (43.6158, 13.5189, 'Ancona', 'city'),
    'San Giuliano Milanese': (45.3989, 9.2733, 'San Giuliano Milanese', 'city'),
    'Padova': (45.4064, 11.8768, 'Padova', 'city'),
    'Milan': (45.4642, 9.1900, 'Milan', 'city'),

    # Switzerland
    'Lausanne': (46.5197, 6.6323, 'Lausanne', 'city'),

    # Iran
    'Hamadan': (34.7992, 48.5146, 'Hamadan', 'city'),
    'Ilam': (33.6374, 46.4227, 'Ilam', 'city'),

    # Netherlands
    'Maastricht': (50.8514, 5.6910, 'Maastricht', 'city'),
    'Eindhoven': (51.4416, 5.4697, 'Eindhoven', 'city'),
    'Rotterdam': (51.9244, 4.4777, 'Rotterdam', 'city'),

    # Germany
    'Aachen': (50.7753, 6.0839, 'Aachen', 'city'),
    'Munich': (48.1351, 11.5820, 'Munich', 'city'),
    'Karlsruhe': (49.0069, 8.4037, 'Karlsruhe', 'city'),

    # Great Britain / UK
    'Edinburgh': (55.9533, -3.1883, 'Edinburgh', 'city'),
    'Nottingham': (52.9548, -1.1581, 'Nottingham', 'city'),

    # Taiwan handled above; France
    'La Rochelle': (46.1603, -1.1511, 'La Rochelle', 'city'),

    # Portugal
    'Lisbon': (38.7223, -9.1393, 'Lisbon', 'city'),

    # Turkey
    'Ankara': (39.9334, 32.8597, 'Ankara', 'city'),

    # Spain
    'Bilbao': (43.2630, -2.9350, 'Bilbao', 'city'),

    # Croatia
    'Split, Zagreb': (45.8150, 15.9819, 'Zagreb (corpus lists Split & Zagreb)', 'city'),

    # Norway
    'Trondheim': (63.4305, 10.3951, 'Trondheim', 'city'),

    # Qatar
    'Doha': (25.2854, 51.5310, 'Doha', 'city'),

    # Brazil — single-city study
    'Paraiba': (-7.1195, -34.8450, 'João Pessoa (Paraíba state, state-level only)', 'province'),
}

# The one multi-city study (id 153_1): resolved as 4 separate points.
MULTI_CITY_STUDIES = {
    'Teresina, Piaui, Petrolina, Pernambuco, \nJoao Pessoa, Paraiba, Manaus, Amazonas': [
        (-5.0892, -42.8019, 'Teresina', 'Piauí'),
        (-9.3891, -40.5030, 'Petrolina', 'Pernambuco'),
        (-7.1195, -34.8450, 'João Pessoa', 'Paraíba'),
        (-3.1190, -60.0217, 'Manaus', 'Amazonas'),
    ],
}
