# Eval light §16.1 — NHTSA data by VIN

Run: 2026-11-17 · 41/41 OK · `npm run eval:vehicle`

VIN = real 11-character prefix from NHTSA complaint records + made-up serial. "by VIN" = the app’s lookup;
"by name" = NHTSA’s own model name. Fewer by VIN means the decoded model name misses NHTSA records.

| Car (NHTSA name) | Decoded from VIN | Recalls VIN / name | Complaints VIN / name | Crash rating | Result |
|---|---|---|---|---|---|
| 2018 HONDA CIVIC | 2018 Honda Civic EX [gas] | 6 / 6 | 596 / 596 | 5/5 | OK |
| 2015 FORD F-150 | 2015 Ford F-150 [gas] | 14 / 14 | 0 / 0 | none | OK |
| 2013 NISSAN ALTIMA | 2013 Nissan Altima [gas] | 12 / 12 | 2318 / 2318 | 5/5 | OK |
| 2017 TOYOTA PRIUS | 2017 Toyota Prius One/Two [hybrid] | 3 / 3 | 91 / 91 | 5/5 | OK |
| 2019 TESLA MODEL 3 | 2019 Tesla Model 3 [ev] | 22 / 22 | 623 / 623 | 5/5 | OK |
| 2012 VOLKSWAGEN JETTA | 2012 Volkswagen Jetta SE [gas] | 8 / 8 | 527 / 527 | not rated | OK |
| 2018 FORD F-150 | 2018 Ford F-150 [gas] | 19 / 19 | 106 / 106 | none | OK |
| 2016 CHEVROLET SILVERADO 1500 | 2016 Chevrolet Silverado 1500 LT [gas] | 12 / 12 | 802 / 802 | 5/5 | OK |
| 2018 RAM 1500 | 2018 RAM 1500 Laramie [diesel] | 15 / 15 | 670 / 670 | 4/5 | OK |
| 2017 GMC SIERRA 1500 | 2017 GMC Sierra 1500 SLT [gas] | 6 / 6 | 433 / 433 | 5/5 | OK |
| 2018 TOYOTA CAMRY | 2018 Toyota Camry L/LE/SE/XLE [gas] | 8 / 8 | 759 / 759 | 5/5 | OK |
| 2016 TOYOTA COROLLA | 2016 Toyota Corolla L/LE [gas] | 1 / 1 | 216 / 216 | 5/5 | OK |
| 2019 TOYOTA RAV4 | 2019 Toyota RAV4 Ltd 4WD HV / Ltd AWD HV (Canada) [hybrid] | 7 / 7 | 889 / 889 | 5/5 | OK |
| 2016 TOYOTA TACOMA | 2016 Toyota Tacoma SR/SR5/TRD Off Road/TRD Sport/TRD Pro [gas] | 4 / 4 | 325 / 325 | not rated | OK |
| 2017 TOYOTA HIGHLANDER | 2017 Toyota Highlander SE/XLE [gas] | 4 / 4 | 274 / 274 | 5/5 | OK |
| 2017 HONDA ACCORD | 2017 Honda Accord Sport [gas] | 3 / 3 | 543 / 543 | 5/5 | OK |
| 2017 HONDA CR-V | 2017 Honda CR-V EX-L/EX-L Navi [gas] | 7 / 7 | 1786 / 1786 | 5/5 | OK |
| 2015 HONDA ODYSSEY | 2015 Honda Odyssey EXL/EXL-N/EXL-R [gas] | 6 / 6 | 209 / 209 | 5/5 | OK |
| 2017 NISSAN ROGUE | 2017 Nissan Rogue [gas] | 5 / 5 | 602 / 602 | 4/5 | OK |
| 2016 JEEP GRAND CHEROKEE | 2016 Jeep Grand Cherokee Limited [gas] | 9 / 9 | 313 / 313 | 4/5 | OK |
| 2018 JEEP WRANGLER | 2018 Jeep Wrangler Unlimited Sport [gas] | 14 / 14 | 1830 / 1830 | not rated | OK |
| 2018 CHEVROLET EQUINOX | 2018 Chevrolet Equinox LT (1LT) [gas] | 5 / 5 | 411 / 411 | 5/5 | OK |
| 2016 CHEVROLET MALIBU | 2016 Chevrolet Malibu LT (1LT) [gas] | 9 / 9 | 865 / 865 | 5/5 | OK |
| 2014 CHEVROLET CRUZE | 2014 Chevrolet Cruze 1LT [gas] | 10 / 10 | 705 / 705 | 5/5 | OK |
| 2014 FORD ESCAPE | 2014 Ford Escape SE [gas] | 16 / 16 | 2092 / 2092 | 4/5 | OK |
| 2017 FORD EXPLORER | 2017 Ford Explorer XLT [gas] | 14 / 14 | 1717 / 1717 | 5/5 | OK |
| 2014 FORD FOCUS | 2014 Ford Focus SE [gas] | 12 / 12 | 2661 / 2661 | 5/5 | OK |
| 2017 HYUNDAI ELANTRA | 2017 Hyundai Elantra SE Popular Pkg, SE Tech pkg, Limited [gas] | 4 / 4 | 771 / 771 | 4/5 | OK |
| 2015 HYUNDAI SONATA | 2015 Hyundai Sonata Sport / Limited / Sport 2.0 [gas] | 9 / 9 | 1158 / 1158 | 5/5 | OK |
| 2016 KIA OPTIMA | 2016 Kia Optima GL [gas] | 5 / 5 | 763 / 763 | 5/5 | OK |
| 2016 KIA SOUL | 2016 Kia Soul Plus [gas] | 2 / 2 | 834 / 834 | 5/5 | OK |
| 2015 SUBARU OUTBACK | 2015 Subaru Outback Limited+Moonroof+EyeSight+NAVI [gas] | 5 / 5 | 510 / 510 | 5/5 | OK |
| 2017 MAZDA CX-5 | 2017 Mazda CX-5 Grand Touring [gas] | 1 / 1 | 150 / 150 | 4/5 | OK |
| 2014 DODGE GRAND CARAVAN | 2014 Dodge Grand Caravan SXT [gas] | 5 / 5 | 359 / 359 | 4/5 | OK |
| 2015 BMW 328I | 2015 BMW 328i SA [gas] | 5 / 5 | 126 / 126 | 5/5 | OK |
| 2016 MERCEDES-BENZ C300 | 2016 Mercedes-Benz C-Class C300-4M [gas] | 13 / 13 | 322 / 322 | 5/5 | OK |
| 2014 MERCEDES-BENZ E350 | 2014 Mercedes-Benz E-Class E350 [gas] | 8 / 8 | 304 / 304 | 4/5 | OK |
| 2015 LEXUS ES 350 | 2015 Lexus ES 350 [gas] | 1 / 1 | 22 / 22 | 5/5 | OK |
| 2013 LEXUS IS 250 | 2013 Lexus IS 250 [gas] | 2 / 2 | 13 / 13 | 4/5 | OK |
| 2016 ACURA MDX | 2016 Acura MDX SH-AWD w/Tech [gas] | 7 / 7 | 378 / 378 | 5/5 | OK |
| 2016 INFINITI Q50 | 2016 Infiniti Q50 [gas] | 4 / 4 | 39 / 39 | not rated | OK |
