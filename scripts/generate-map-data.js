const fs = require('fs');
const path = require('path');

// Scotland Yard data from AlexElvers/scotland-yard-data
const stationsData = `1 190 40 taxi,bus,underground
2 487 20 taxi
3 675 25 taxi,bus
4 790 15 taxi
5 1253 30 taxi
6 1396 29 taxi
7 1541 36 taxi,bus
8 133 107 taxi
9 250 115 taxi
10 583 107 taxi
11 670 123 taxi
12 740 107 taxi
13 875 100 taxi,bus,underground
14 1008 77 taxi,bus
15 1150 63 taxi,bus
16 1282 111 taxi
17 1530 155 taxi
18 65 163 taxi
19 173 176 taxi
20 314 145 taxi
21 452 202 taxi
22 675 225 taxi,bus
23 784 165 taxi,bus
24 955 170 taxi
25 1029 191 taxi
26 1140 108 taxi
27 1160 175 taxi
28 1211 148 taxi
29 1400 187 taxi,bus
30 1580 176 taxi
31 110 215 taxi
32 264 254 taxi
33 390 235 taxi
34 590 256 taxi,bus
35 712 288 taxi
36 760 294 taxi
37 838 223 taxi
38 994 234 taxi
39 1065 218 taxi
40 1188 268 taxi
41 1240 250 taxi,bus
42 1536 251 taxi,bus
43 37 277 taxi
44 198 310 taxi
45 307 332 taxi
46 409 299 taxi,bus,underground
47 489 282 taxi
48 617 338 taxi
49 797 341 taxi
50 875 288 taxi
51 1030 300 taxi
52 1111 278 taxi,bus
53 1202 330 taxi
54 1262 313 taxi
55 1402 310 taxi,bus
56 1586 326 taxi
57 87 339 taxi
58 243 358 taxi,bus
59 275 395 taxi
60 335 384 taxi
61 437 400 taxi
62 493 381 taxi
63 627 451 taxi,bus
64 708 436 taxi
65 793 416 taxi,bus
66 848 403 taxi
67 934 390 taxi,bus,underground
68 1046 365 taxi
69 1146 359 taxi
70 1272 381 taxi
71 1383 380 taxi
72 1499 389 taxi,bus
73 85 403 taxi
74 141 468 taxi,bus,underground
75 217 446 taxi
76 316 441 taxi
77 382 491 taxi,bus
78 460 481 taxi,bus
79 518 468 taxi,bus,underground
80 653 496 taxi
81 763 514 taxi
82 803 486 taxi,bus
83 915 470 taxi
84 987 434 taxi
85 1051 412 taxi
86 1163 454 taxi,bus
87 1279 482 taxi,bus
88 1331 496 taxi
89 1374 458 taxi,bus,underground
90 1456 458 taxi
91 1569 458 taxi
92 44 520 taxi
93 51 568 taxi,bus,underground
94 151 547 taxi,bus
95 197 539 taxi
96 432 574 taxi
97 483 555 taxi
98 549 533 taxi
99 613 542 taxi
100 725 574 taxi,bus
101 840 530 taxi
102 978 473 taxi,bus
103 1069 463 taxi
104 1163 509 taxi
105 1421 529 taxi,bus
106 1520 548 taxi
107 1591 548 taxi,bus
108 1393 642 taxi,bus
109 509 654 taxi
110 584 579 taxi
111 632 638 taxi,bus,underground
112 662 617 taxi
113 771 617 taxi
114 852 592 taxi
115 972 553 taxi
116 1165 623 taxi,bus
117 1294 670 taxi
118 1166 699 taxi
119 1558 727 taxi
120 42 773 taxi
121 96 774 taxi
122 177 770 taxi,bus
123 374 765 taxi,bus
124 492 742 taxi,bus
125 695 670 taxi
126 910 636 taxi
127 1055 671 taxi,bus
128 1243 894 taxi,bus,underground
129 1283 714 taxi
130 668 747 taxi
131 724 707 taxi
132 851 699 taxi
133 995 766 taxi,bus
134 1097 731 taxi
135 1334 754 taxi,bus
136 1522 829 taxi
137 309 834 taxi
138 528 787 taxi
139 657 794 taxi
140 849 779 taxi,bus,underground
141 1033 791 taxi
142 1165 814 taxi,bus
143 1284 801 taxi
144 55 912 taxi,bus
145 115 907 taxi
146 194 902 taxi
147 252 886 taxi
148 331 874 taxi
149 399 866 taxi
150 478 841 taxi
151 515 879 taxi
152 569 837 taxi
153 600 884 taxi,bus,underground
154 733 853 taxi,bus
155 779 909 taxi
156 873 909 taxi,bus
157 949 917 taxi,bus
158 1077 865 taxi
159 1083 1041 taxi
160 1339 913 taxi
161 1445 901 taxi,bus
162 1593 899 taxi
163 183 944 taxi,bus,underground
164 264 944 taxi
165 417 972 taxi,bus
166 576 934 taxi
167 700 960 taxi
168 746 990 taxi
169 873 974 taxi
170 937 983 taxi
171 1416 1160 taxi
172 1200 976 taxi
173 1367 1027 taxi
174 1507 990 taxi
175 1584 1043 taxi
176 33 1028 taxi,bus
177 101 1009 taxi
178 218 999 taxi
179 358 1016 taxi
180 446 1032 taxi,bus
181 533 1010 taxi
182 580 1023 taxi
183 666 983 taxi
184 807 1041 taxi,bus
185 911 1108 taxi,bus,underground
186 1013 1088 taxi
187 1162 1053 taxi,bus
188 1307 1057 taxi
189 101 1123 taxi
190 176 1162 taxi,bus
191 267 1086 taxi,bus
192 289 1186 taxi
193 509 1093 taxi
194 534 1128 taxi
195 600 1125 taxi
196 700 1068 taxi
197 713 1134 taxi
198 1073 1191 taxi
199 1322 1186 taxi,bus`;

const connectionsData = `108 115 water
115 157 water
157 194 water
1 46 underground
13 46 underground
13 67 underground
13 89 underground
46 74 underground
46 79 underground
67 79 underground
67 89 underground
67 111 underground
79 93 underground
79 111 underground
89 128 underground
89 140 underground
111 153 underground
111 163 underground
128 140 underground
128 185 underground
140 153 underground
153 163 underground
153 185 underground
1 46 bus
1 58 bus
3 22 bus
3 23 bus
7 42 bus
13 14 bus
13 23 bus
13 52 bus
14 15 bus
15 29 bus
15 41 bus
22 23 bus
22 34 bus
22 65 bus
23 67 bus
29 41 bus
29 42 bus
29 55 bus
34 46 bus
34 63 bus
41 52 bus
41 87 bus
42 72 bus
46 58 bus
46 78 bus
52 67 bus
52 86 bus
55 89 bus
58 74 bus
58 77 bus
63 65 bus
63 79 bus
63 100 bus
65 67 bus
65 82 bus
67 82 bus
67 102 bus
72 105 bus
72 107 bus
74 94 bus
77 78 bus
77 94 bus
77 124 bus
78 79 bus
82 100 bus
82 140 bus
86 87 bus
86 102 bus
86 116 bus
87 105 bus
89 105 bus
93 94 bus
100 111 bus
102 127 bus
105 107 bus
105 108 bus
107 161 bus
108 116 bus
108 135 bus
111 124 bus
116 127 bus
116 142 bus
122 123 bus
122 144 bus
123 124 bus
123 144 bus
123 165 bus
124 153 bus
127 133 bus
128 135 bus
128 142 bus
128 161 bus
128 187 bus
128 199 bus
133 140 bus
133 157 bus
135 161 bus
140 154 bus
140 156 bus
142 157 bus
144 163 bus
153 154 bus
153 180 bus
153 184 bus
154 156 bus
156 157 bus
156 184 bus
157 185 bus
161 199 bus
163 176 bus
163 191 bus
165 180 bus
165 191 bus
176 190 bus
180 184 bus
180 190 bus
184 185 bus
185 187 bus
190 191 bus
1 8 taxi
1 9 taxi
2 10 taxi
2 20 taxi
3 4 taxi
3 11 taxi
3 12 taxi
4 13 taxi
5 15 taxi
5 16 taxi
6 7 taxi
6 29 taxi
7 17 taxi
8 18 taxi
8 19 taxi
9 19 taxi
9 20 taxi
10 11 taxi
10 21 taxi
10 34 taxi
11 22 taxi
12 23 taxi
13 14 taxi
13 23 taxi
13 24 taxi
14 15 taxi
14 25 taxi
15 16 taxi
15 26 taxi
15 28 taxi
16 28 taxi
16 29 taxi
17 29 taxi
17 30 taxi
18 31 taxi
18 43 taxi
19 32 taxi
20 33 taxi
21 33 taxi
22 23 taxi
22 34 taxi
22 35 taxi
23 37 taxi
24 37 taxi
24 38 taxi
25 38 taxi
25 39 taxi
26 27 taxi
26 39 taxi
27 28 taxi
27 40 taxi
28 41 taxi
29 41 taxi
29 42 taxi
30 42 taxi
31 43 taxi
31 44 taxi
32 33 taxi
32 44 taxi
32 45 taxi
33 46 taxi
34 47 taxi
34 48 taxi
35 36 taxi
35 48 taxi
35 65 taxi
36 37 taxi
36 49 taxi
37 50 taxi
38 50 taxi
38 51 taxi
39 51 taxi
39 52 taxi
40 41 taxi
40 52 taxi
40 53 taxi
41 54 taxi
42 56 taxi
42 72 taxi
43 57 taxi
44 58 taxi
45 46 taxi
45 58 taxi
45 59 taxi
45 60 taxi
46 47 taxi
46 61 taxi
47 62 taxi
48 62 taxi
48 63 taxi
49 50 taxi
49 66 taxi
51 52 taxi
51 67 taxi
51 68 taxi
52 69 taxi
53 54 taxi
53 69 taxi
54 55 taxi
54 70 taxi
55 71 taxi
56 91 taxi
57 58 taxi
57 73 taxi
58 59 taxi
58 74 taxi
58 75 taxi
59 75 taxi
59 76 taxi
60 61 taxi
60 76 taxi
61 62 taxi
61 76 taxi
61 78 taxi
62 79 taxi
63 64 taxi
63 79 taxi
63 80 taxi
64 65 taxi
64 81 taxi
65 66 taxi
65 82 taxi
66 67 taxi
66 82 taxi
67 68 taxi
67 84 taxi
68 69 taxi
68 85 taxi
69 86 taxi
70 71 taxi
70 87 taxi
71 72 taxi
71 89 taxi
72 90 taxi
72 91 taxi
73 74 taxi
73 92 taxi
74 75 taxi
74 92 taxi
75 94 taxi
76 77 taxi
77 78 taxi
77 95 taxi
77 96 taxi
78 79 taxi
78 97 taxi
79 98 taxi
80 99 taxi
80 100 taxi
81 82 taxi
81 100 taxi
82 101 taxi
83 101 taxi
83 102 taxi
84 85 taxi
85 103 taxi
86 103 taxi
86 104 taxi
87 88 taxi
88 89 taxi
88 117 taxi
89 105 taxi
90 91 taxi
90 105 taxi
91 105 taxi
91 107 taxi
92 93 taxi
93 94 taxi
94 95 taxi
95 122 taxi
96 97 taxi
96 109 taxi
97 98 taxi
97 109 taxi
98 99 taxi
98 110 taxi
99 110 taxi
99 112 taxi
100 101 taxi
100 112 taxi
100 113 taxi
101 114 taxi
102 103 taxi
102 115 taxi
104 116 taxi
105 106 taxi
105 108 taxi
106 107 taxi
107 119 taxi
108 117 taxi
108 119 taxi
109 110 taxi
109 124 taxi
110 111 taxi
111 112 taxi
111 124 taxi
112 125 taxi
113 114 taxi
113 125 taxi
114 115 taxi
114 126 taxi
114 131 taxi
114 132 taxi
115 126 taxi
115 127 taxi
116 117 taxi
116 118 taxi
116 127 taxi
117 129 taxi
118 129 taxi
118 134 taxi
118 142 taxi
119 136 taxi
120 121 taxi
120 144 taxi
121 122 taxi
121 145 taxi
122 123 taxi
122 146 taxi
123 124 taxi
123 137 taxi
123 148 taxi
123 149 taxi
124 130 taxi
124 138 taxi
125 131 taxi
126 127 taxi
126 140 taxi
127 133 taxi
127 134 taxi
128 142 taxi
128 143 taxi
128 160 taxi
128 172 taxi
128 188 taxi
129 135 taxi
129 142 taxi
129 143 taxi
130 131 taxi
130 139 taxi
132 140 taxi
133 140 taxi
133 141 taxi
134 141 taxi
134 142 taxi
135 136 taxi
135 143 taxi
135 161 taxi
136 162 taxi
137 147 taxi
138 150 taxi
138 152 taxi
139 140 taxi
139 153 taxi
139 154 taxi
140 154 taxi
140 156 taxi
141 142 taxi
141 158 taxi
142 143 taxi
142 158 taxi
143 160 taxi
144 145 taxi
144 177 taxi
145 146 taxi
146 147 taxi
146 163 taxi
147 164 taxi
148 149 taxi
148 164 taxi
149 150 taxi
149 165 taxi
150 151 taxi
151 152 taxi
151 165 taxi
151 166 taxi
152 153 taxi
153 154 taxi
153 166 taxi
153 167 taxi
154 155 taxi
155 156 taxi
155 167 taxi
155 168 taxi
156 157 taxi
156 169 taxi
157 158 taxi
157 170 taxi
158 159 taxi
159 170 taxi
159 172 taxi
159 186 taxi
159 198 taxi
160 161 taxi
160 173 taxi
161 174 taxi
162 175 taxi
163 177 taxi
164 178 taxi
164 179 taxi
165 179 taxi
165 180 taxi
166 181 taxi
166 183 taxi
167 168 taxi
167 183 taxi
168 184 taxi
169 184 taxi
170 185 taxi
171 173 taxi
171 175 taxi
171 199 taxi
172 187 taxi
173 174 taxi
173 188 taxi
174 175 taxi
176 177 taxi
176 189 taxi
178 189 taxi
178 191 taxi
179 191 taxi
180 181 taxi
180 193 taxi
181 182 taxi
181 193 taxi
182 183 taxi
182 195 taxi
183 196 taxi
184 185 taxi
184 196 taxi
184 197 taxi
185 186 taxi
186 198 taxi
187 188 taxi
187 198 taxi
188 199 taxi
189 190 taxi
190 191 taxi
190 192 taxi
191 192 taxi
192 194 taxi
193 194 taxi
194 195 taxi
195 197 taxi
196 197 taxi
198 199 taxi`;

// Parse stations
const stations = {};
stationsData.split('\n').forEach(line => {
  const parts = line.trim().split(' ');
  const id = parseInt(parts[0]);
  const x = parseInt(parts[1]);
  const y = parseInt(parts[2]);
  const transports = parts[3] ? parts[3].split(',') : [];

  stations[id] = {
    id,
    x,
    y,
    transports
  };
});

// Parse connections
const connections = [];
connectionsData.split('\n').forEach(line => {
  const parts = line.trim().split(' ');
  const from = parseInt(parts[0]);
  const to = parseInt(parts[1]);
  // waterをferryに変換
  const transport = parts[2] === 'water' ? 'ferry' : parts[2];

  connections.push({
    from,
    to,
    transport: transport.toUpperCase()
  });
});

// Generate output
const output = {
  stations,
  connections
};

// Write to file
const outputPath = path.join(__dirname, '../packages/domain/src/data/map-data.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log(`Map data generated successfully at ${outputPath}`);
console.log(`Total stations: ${Object.keys(stations).length}`);
console.log(`Total connections: ${connections.length}`);
