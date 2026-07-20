/**
 * melvinDrifts.js  -  Lough Melvin drift / bay dataset
 * Angler's Tactical Report
 *
 * Data only. Generated from melvinDrifts.json (kept alongside as the
 * readable source of truth). Loaded with a plain <script src> so it is
 * synchronous and cached - no fetch, no async race, works on bad signal.
 *
 * EDITING: change melvinDrifts.json, then mirror the change here. Or edit
 * here directly - it is the same structure, just assigned to a global.
 *
 * Coordinates are deliberately null until surveyed. Do not invent them.
 */
window.MELVIN_DRIFTS = {
  "_meta": {
    "lough": "Lough Melvin",
    "counties": [
      "Leitrim (IE)",
      "Fermanagh (NI)"
    ],
    "centre": {
      "lat": 54.435,
      "lng": -8.209
    },
    "surfaceAreaKm2": 21.25,
    "maxLengthKm": 12,
    "maxWidthKm": 3,
    "maxDepthM": 45,
    "version": "0.2-starter",
    "authored": "2026-07-20 (rev 0.2)",
    "purpose": "Location layer for the 'ghillie in my pocket' bay-naming function. Feeds the wind-matcher, which ranks drifts by forecast wind + species + wave gate.",
    "CONFIDENCE_RULES": {
      "high": "Named in published fishery sources AND/OR personally verified on the water. Safe to surface to the user unqualified.",
      "med": "Named in published sources but geometry/depth/aspect is inferred, not measured. Surface with a soft hedge.",
      "low": "Placeholder. Position, depth or aspect is a guess from general lough geography. DO NOT surface to the user until upgraded. Present in the file so it can be filled in, not so it can be trusted."
    },
    "HOW_TO_USE_THIS_FILE": [
      "Every drift starts with lat/lng NULL. I have deliberately not invented coordinates - fabricated GPS marks are worse than none in a boat.",
      "Fill startPoint/endPoint by dropping pins on the i-Boating chart or from your own GPS track, then flip coordsConfidence to 'high'.",
      "Fill depthMinM/depthMaxM from your sounder on the practice days (Thu 27 / Sat 29 Aug), then flip depthConfidence.",
      "aspect = the compass direction the shoreline FACES. A shore facing NW fishes on a NW wind (wind blows into it, food stacks up, wave builds).",
      "windGood is currently DERIVED from aspect, not observed. Overwrite with local knowledge (Phil Bowman, Sean Maguire's, Paul Bradley) - that beats any geometry rule.",
      "Do not delete low-confidence entries. Empty fields are honest; deleted rows lose the question."
    ],
    "SOURCES": [
      {
        "id": "IFI",
        "ref": "fishinginireland.info - Lough Melvin trout/salmon pages",
        "note": "Names productive areas: sunken islands, Farrell's Bay, Inishmean, Church Island, Rossinver, long drifts to Garrison, Kinlough Bay early season."
      },
      {
        "id": "ROSSINVER",
        "ref": "rossinver-fishery.com",
        "note": "Fishery boundary, Rossinver Bay fly-only buoys, species behaviour."
      },
      {
        "id": "HERITAGE",
        "ref": "Rossinver Heritage Group / Rossinver Youth & Community Project, 2021",
        "note": "Island list incl. Rosskit 'once connected to the mainland by a ridge of stones'."
      },
      {
        "id": "RECON",
        "ref": "Personal recon day, 24 June 2026",
        "note": "Champion of the Lough practice - damsel/sedge food event, boobies off drop-offs."
      },
      {
        "id": "INFERRED",
        "ref": "Glacial ribbon-lake typology",
        "note": "NOT a source. Marks where geometry is reasoned, not known."
      }
    ],
    "KNOWN_UNKNOWNS": [
      "No open bathymetric survey of Melvin exists (data.gov.ie publishes only Feeagh and Furnace). Contours on i-Boating are proprietary and of unverified provenance.",
      "The 'sunken islands' are repeatedly named in angling sources but never located. Getting their GPS positions is the single highest-value field trip task.",
      "'Church Island' appears in IFI angling text but not in the formal island list - likely a local name for one of the named islands. Resolve locally.",
      "Drop-off angles and directions are NOT documented anywhere. All shelf geometry below is inference.",
      "The gillaroo late-summer surface-feeding exception is documented in general sources but not specifically observed on Melvin in August by this angler. Treat it as a strong hypothesis to test on Thu 27 Aug, not a certainty."
    ],
    "CHANGELOG": [
      "0.2 - CORRECTION: gillaroo were modelled as bottom-feeders year-round with a hard wave gate. That is wrong for late summer. Published sources state gillaroo feed almost exclusively on bottom-living animals EXCEPT in late summer, when they come to the surface and can be taken on the dry fly. All gillaroo drifts now carry an August override. This matters directly for the GLMAA competition, 26-30 Aug.",
      "0.2 - Added seasonalOverride blocks so the wind-matcher can swap behaviour by month rather than treating species rules as fixed."
    ]
  },
  "regulatoryZones": [
    {
      "id": "rossinver-bay-fly-only",
      "name": "Rossinver Bay fly-only zone",
      "rule": "Fly fishing only. Bounded by the red buoy on the eastern side of Ross Point to a similar red buoy at the southern end of the Roosky shore. Water inshore of the marker buoys from Ross Point to the Border is fly only from 15 May to end of season.",
      "appliesFrom": "05-15",
      "appliesTo": "season-end",
      "source": "ROSSINVER",
      "confidence": "high",
      "appAction": "Never recommend a non-fly method for any drift tagged inZone: 'rossinver-bay-fly-only'."
    },
    {
      "id": "ni-border",
      "name": "Northern Ireland jurisdiction",
      "rule": "The NE corner of the lough lies in Northern Ireland and requires a NI rod licence and a Garrison Anglers permit. Fishery boundary runs from the mouth of the Kilcoo (County) River in the SE to Maguire's Island on the north shore, thence to the townland of Glack on the SW shore.",
      "source": "ROSSINVER",
      "confidence": "high",
      "appAction": "If user has not flagged a Garrison permit, demote or warn on any drift tagged jurisdiction: 'NI'."
    }
  ],
  "markers": [
    {
      "id": "buoy-ross-point",
      "name": "Red buoy, east side of Ross Point",
      "type": "regulatory",
      "lat": null,
      "lng": null,
      "confidence": "high",
      "coordsConfidence": "low",
      "source": "ROSSINVER"
    },
    {
      "id": "buoy-roosky",
      "name": "Red buoy, south end of Roosky shore",
      "type": "regulatory",
      "lat": null,
      "lng": null,
      "confidence": "high",
      "coordsConfidence": "low",
      "source": "ROSSINVER"
    }
  ],
  "piers": [
    {
      "id": "kinlough-pier",
      "name": "Kinlough Pier",
      "lat": null,
      "lng": null,
      "source": "IFI"
    },
    {
      "id": "stracomer",
      "name": "Stracomer",
      "lat": null,
      "lng": null,
      "source": "IFI"
    },
    {
      "id": "breffni-pier",
      "name": "Breffni Pier",
      "lat": null,
      "lng": null,
      "source": "IFI"
    },
    {
      "id": "dernaseer",
      "name": "Dernaseer Pier",
      "lat": null,
      "lng": null,
      "source": "IFI"
    },
    {
      "id": "garrison",
      "name": "Garrison",
      "lat": null,
      "lng": null,
      "jurisdiction": "NI",
      "source": "IFI"
    }
  ],
  "islands": [
    {
      "id": "inisheher",
      "name": "Inisheher (Inis Thair, 'West Island')",
      "areaAcres": 20,
      "position": "most westerly",
      "confidence": "high",
      "source": "HERITAGE"
    },
    {
      "id": "inishmean",
      "name": "Inishmean ('Middle Island')",
      "areaAcres": 23,
      "confidence": "high",
      "source": "HERITAGE"
    },
    {
      "id": "inishtemple",
      "name": "Inishtemple",
      "confidence": "high",
      "source": "WIKI/HERITAGE",
      "note": "Possibly the 'Church Island' of angling sources - inis teampaill = church island. RESOLVE LOCALLY."
    },
    {
      "id": "inishkeen",
      "name": "Inishkeen",
      "confidence": "high",
      "source": "WIKI"
    },
    {
      "id": "gorminish",
      "name": "Gorminish Island",
      "confidence": "high",
      "source": "WIKI/HERITAGE"
    },
    {
      "id": "bilberry",
      "name": "Bilberry Island",
      "confidence": "high",
      "source": "HERITAGE"
    },
    {
      "id": "rosskit",
      "name": "Rosskit",
      "confidence": "high",
      "source": "HERITAGE",
      "note": "KEY STRUCTURE: once connected to the mainland by a ridge of stones - i.e. a drowned boulder ridge runs island-to-shore. Hazard and fish-holder both."
    },
    {
      "id": "sally",
      "name": "Sally Island",
      "confidence": "high",
      "source": "HERITAGE"
    },
    {
      "id": "maguires",
      "name": "Maguire's Island",
      "confidence": "high",
      "source": "ROSSINVER",
      "note": "Fishery boundary reference point on the north shore."
    }
  ],
  "drifts": [
    {
      "id": "rossinver-bay-reed-edge",
      "name": "Rossinver Bay - Ross Point reed edge",
      "bay": "Rossinver Bay",
      "jurisdiction": "IE",
      "inZone": "rossinver-bay-fly-only",
      "startPoint": {
        "lat": null,
        "lng": null
      },
      "endPoint": {
        "lat": null,
        "lng": null
      },
      "coordsConfidence": "low",
      "aspect": null,
      "windGood": [],
      "windDead": [],
      "depthMinM": null,
      "depthMaxM": null,
      "depthConfidence": "low",
      "structure": "reed edge running into shelving margin",
      "substrate": "unverified",
      "species": [
        "salmon",
        "gillaroo",
        "brown trout"
      ],
      "waveGate": false,
      "seasonBest": [
        "Mar",
        "Apr",
        "Jun",
        "Jul",
        "Aug"
      ],
      "notes": "Rossinver Bay is the premium fly area for salmon - fish accumulate to spawn in the Glenaniff River. Spring fish on the fly from late March, especially April; grilse from June.",
      "confidence": "high",
      "source": [
        "IFI",
        "ROSSINVER"
      ],
      "augustOverride": "Late summer: gillaroo may be on the surface here. Carry the 5wt with a single dry (Green Peter Dry or Dry Daddy). Wave gate softens - do not write this drift off in a flat calm as you would in June.",
      "waveGateAugust": false
    },
    {
      "id": "glenaniff-mouth",
      "name": "Glenaniff River mouth",
      "bay": "Rossinver Bay",
      "jurisdiction": "IE",
      "inZone": "rossinver-bay-fly-only",
      "startPoint": {
        "lat": null,
        "lng": null
      },
      "endPoint": {
        "lat": null,
        "lng": null
      },
      "coordsConfidence": "low",
      "aspect": null,
      "windGood": [],
      "windDead": [],
      "depthMinM": null,
      "depthMaxM": null,
      "depthConfidence": "low",
      "structure": "inflow delta - gravel/silt fan shelving to drop-off",
      "substrate": "gravel (inferred from inflow)",
      "species": [
        "salmon"
      ],
      "waveGate": false,
      "seasonBest": [
        "Apr",
        "Jun",
        "Jul",
        "Aug"
      ],
      "notes": "Salmon stage here before running the Glenaniff. Nine rivers/streams feed the lough; every inflow builds a fan that then drops off - a repeatable structure type worth mapping at each.",
      "confidence": "med",
      "source": [
        "ROSSINVER",
        "INFERRED"
      ]
    },
    {
      "id": "sunken-islands",
      "name": "The Sunken Islands",
      "bay": "open water - position TBC",
      "jurisdiction": "TBC",
      "startPoint": {
        "lat": null,
        "lng": null
      },
      "endPoint": {
        "lat": null,
        "lng": null
      },
      "coordsConfidence": "low",
      "aspect": null,
      "windGood": [],
      "windDead": [],
      "depthMinM": null,
      "depthMaxM": null,
      "depthConfidence": "low",
      "structure": "sub-surface rocky shoals rising from deeper water; do not break the surface",
      "substrate": "rock (mollusc-bearing)",
      "species": [
        "gillaroo",
        "brown trout"
      ],
      "waveGate": true,
      "seasonBest": [
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep"
      ],
      "hazard": true,
      "hazardNote": "Unmarked and invisible from the surface. Approach on oars or electric, not under power.",
      "notes": "Named repeatedly in IFI material as a prime area. Gillaroo hold here for the molluscs. A good wave is normally needed before gillaroo come to the fly - hence waveGate: true.",
      "confidence": "high",
      "coordsNote": "TOP FIELD PRIORITY 27 Aug: get GPS marks and depth-over. This is the most valuable missing data in the whole file.",
      "source": [
        "IFI"
      ],
      "augustOverride": "Late summer: gillaroo may be on the surface here. Carry the 5wt with a single dry (Green Peter Dry or Dry Daddy). Wave gate softens - do not write this drift off in a flat calm as you would in June.",
      "waveGateAugust": false
    },
    {
      "id": "rosskit-stone-ridge",
      "name": "Rosskit stone ridge",
      "bay": "TBC",
      "jurisdiction": "TBC",
      "startPoint": {
        "lat": null,
        "lng": null
      },
      "endPoint": {
        "lat": null,
        "lng": null
      },
      "coordsConfidence": "low",
      "aspect": null,
      "windGood": [],
      "windDead": [],
      "depthMinM": null,
      "depthMaxM": null,
      "depthConfidence": "low",
      "structure": "drowned boulder ridge running island-to-mainland; classic ledge run",
      "substrate": "boulder/rock",
      "species": [
        "gillaroo",
        "brown trout",
        "ferox"
      ],
      "waveGate": true,
      "seasonBest": [
        "May",
        "Jun",
        "Jul",
        "Aug"
      ],
      "hazard": true,
      "hazardNote": "Submerged stone ridge - genuine prop hazard in low water.",
      "notes": "Rosskit was historically connected to the mainland by a ridge of stones. That ridge is now drowned. Documented rock line, exactly the ledge-run structure that holds fish. Fish the ridge shoulders, not the crown.",
      "confidence": "med",
      "source": [
        "HERITAGE",
        "INFERRED"
      ],
      "augustOverride": "Late summer: gillaroo may be on the surface here. Carry the 5wt with a single dry (Green Peter Dry or Dry Daddy). Wave gate softens - do not write this drift off in a flat calm as you would in June.",
      "waveGateAugust": false
    },
    {
      "id": "kinlough-bay",
      "name": "Kinlough Bay",
      "bay": "Kinlough Bay",
      "jurisdiction": "IE",
      "startPoint": {
        "lat": null,
        "lng": null
      },
      "endPoint": {
        "lat": null,
        "lng": null
      },
      "coordsConfidence": "low",
      "aspect": null,
      "windGood": [],
      "windDead": [],
      "depthMinM": null,
      "depthMaxM": null,
      "depthConfidence": "low",
      "structure": "shallow bay at the top (west) end; Drowes outflow nearby",
      "substrate": "unverified",
      "species": [
        "sonaghan",
        "brown trout"
      ],
      "waveGate": false,
      "seasonBest": [
        "Mar",
        "Apr"
      ],
      "notes": "Fishes extremely well March/April with sonaghan concentrated at the top of the lough early in the year. Fish then spread down the lough. LOW PRIORITY for a late-August competition - flag as out-of-season rather than deleting.",
      "confidence": "high",
      "source": [
        "IFI"
      ]
    },
    {
      "id": "farrells-bay",
      "name": "Farrell's Bay",
      "bay": "Farrell's Bay",
      "jurisdiction": "TBC",
      "startPoint": {
        "lat": null,
        "lng": null
      },
      "endPoint": {
        "lat": null,
        "lng": null
      },
      "coordsConfidence": "low",
      "aspect": null,
      "windGood": [],
      "windDead": [],
      "depthMinM": null,
      "depthMaxM": null,
      "depthConfidence": "low",
      "structure": "bay - geometry unverified",
      "substrate": "unverified",
      "species": [
        "brown trout",
        "sonaghan",
        "gillaroo"
      ],
      "waveGate": false,
      "seasonBest": [
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep"
      ],
      "notes": "Named by IFI among the productive areas through the main part of the season. No structural detail published.",
      "confidence": "med",
      "source": [
        "IFI"
      ],
      "augustOverride": "Late summer: gillaroo may be on the surface here. Carry the 5wt with a single dry (Green Peter Dry or Dry Daddy). Wave gate softens - do not write this drift off in a flat calm as you would in June.",
      "waveGateAugust": false
    },
    {
      "id": "inishmean-shores",
      "name": "Inishmean shores",
      "bay": "island water",
      "jurisdiction": "TBC",
      "startPoint": {
        "lat": null,
        "lng": null
      },
      "endPoint": {
        "lat": null,
        "lng": null
      },
      "coordsConfidence": "low",
      "aspect": null,
      "windGood": [],
      "windDead": [],
      "depthMinM": null,
      "depthMaxM": null,
      "depthConfidence": "low",
      "structure": "rocky island fringe shelving into the basin",
      "substrate": "rock (mollusc-bearing)",
      "species": [
        "gillaroo",
        "brown trout"
      ],
      "waveGate": true,
      "seasonBest": [
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep"
      ],
      "notes": "IFI names the shores along Inishmean among the productive areas. 23-acre island, the 'Middle Island'. Fish the shelving fringe, not out over the drop.",
      "confidence": "high",
      "source": [
        "IFI",
        "HERITAGE"
      ],
      "augustOverride": "Late summer: gillaroo may be on the surface here. Carry the 5wt with a single dry (Green Peter Dry or Dry Daddy). Wave gate softens - do not write this drift off in a flat calm as you would in June.",
      "waveGateAugust": false
    },
    {
      "id": "inisheher-shores",
      "name": "Inisheher shores",
      "bay": "island water",
      "jurisdiction": "TBC",
      "startPoint": {
        "lat": null,
        "lng": null
      },
      "endPoint": {
        "lat": null,
        "lng": null
      },
      "coordsConfidence": "low",
      "aspect": null,
      "windGood": [],
      "windDead": [],
      "depthMinM": null,
      "depthMaxM": null,
      "depthConfidence": "low",
      "structure": "rocky island fringe shelving into the basin",
      "substrate": "rock (inferred)",
      "species": [
        "gillaroo",
        "brown trout"
      ],
      "waveGate": true,
      "seasonBest": [
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep"
      ],
      "notes": "Most westerly island, ~20 acres. Not specifically named by IFI as productive - included on structural grounds (rocky island fringe = gillaroo habitat). Verify before surfacing.",
      "confidence": "low",
      "source": [
        "HERITAGE",
        "INFERRED"
      ],
      "augustOverride": "Late summer: gillaroo may be on the surface here. Carry the 5wt with a single dry (Green Peter Dry or Dry Daddy). Wave gate softens - do not write this drift off in a flat calm as you would in June.",
      "waveGateAugust": false
    },
    {
      "id": "church-island-shores",
      "name": "Church Island shores",
      "bay": "island water",
      "jurisdiction": "TBC",
      "startPoint": {
        "lat": null,
        "lng": null
      },
      "endPoint": {
        "lat": null,
        "lng": null
      },
      "coordsConfidence": "low",
      "aspect": null,
      "windGood": [],
      "windDead": [],
      "depthMinM": null,
      "depthMaxM": null,
      "depthConfidence": "low",
      "structure": "rocky island fringe",
      "substrate": "rock (inferred)",
      "species": [
        "gillaroo",
        "brown trout"
      ],
      "waveGate": true,
      "seasonBest": [
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep"
      ],
      "notes": "IFI names 'Church Island' among productive shores but it does not appear in the formal island list. Probably Inishtemple. Ask in Garrison and merge the records once confirmed.",
      "confidence": "med",
      "source": [
        "IFI"
      ],
      "augustOverride": "Late summer: gillaroo may be on the surface here. Carry the 5wt with a single dry (Green Peter Dry or Dry Daddy). Wave gate softens - do not write this drift off in a flat calm as you would in June.",
      "waveGateAugust": false
    },
    {
      "id": "garrison-long-drifts",
      "name": "Long drifts down towards Garrison",
      "bay": "north-east end",
      "jurisdiction": "NI",
      "startPoint": {
        "lat": null,
        "lng": null
      },
      "endPoint": {
        "lat": null,
        "lng": null
      },
      "coordsConfidence": "low",
      "aspect": null,
      "windGood": [],
      "windDead": [],
      "depthMinM": null,
      "depthMaxM": null,
      "depthConfidence": "low",
      "structure": "open water long drift",
      "substrate": "unverified",
      "species": [
        "sonaghan",
        "brown trout",
        "salmon"
      ],
      "waveGate": false,
      "seasonBest": [
        "Jun",
        "Jul",
        "Aug",
        "Sep"
      ],
      "notes": "IFI names long drifts down towards Garrison among the productive areas through the season. Spring salmon are taken trolling in the Garrison area from 1 Feb. NI jurisdiction - Garrison Anglers permit and NI rod licence required.",
      "confidence": "high",
      "source": [
        "IFI"
      ]
    },
    {
      "id": "main-basin-deep",
      "name": "Main basin - open deep water",
      "bay": "mid-lough",
      "jurisdiction": "TBC",
      "startPoint": {
        "lat": null,
        "lng": null
      },
      "endPoint": {
        "lat": null,
        "lng": null
      },
      "coordsConfidence": "low",
      "aspect": null,
      "windGood": [],
      "windDead": [],
      "depthMinM": 12,
      "depthMaxM": 45,
      "depthConfidence": "med",
      "structure": "open basin, structureless bottom, max depth 45 m / 148 ft",
      "substrate": "n/a - fished near surface",
      "species": [
        "sonaghan"
      ],
      "waveGate": false,
      "seasonBest": [
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep"
      ],
      "notes": "Sonaghan can be caught anywhere in any depth (140 ft in the middle). They are pelagic daphnia feeders, taken close to the SURFACE over deep water - do not fish this deep. Where the daphnia concentrate is wind- and light-driven, so this 'drift' is really a moving target: score it on light and wind, not position.",
      "appNote": "Special case - this entry should be scored as a zone, not a fixed drift line. The wind-matcher needs a branch for pelagic species.",
      "confidence": "high",
      "source": [
        "IFI"
      ]
    },
    {
      "id": "sidewall-dropoffs",
      "name": "Side-wall drop-offs (NW and SE shores)",
      "bay": "long shores",
      "jurisdiction": "TBC",
      "startPoint": {
        "lat": null,
        "lng": null
      },
      "endPoint": {
        "lat": null,
        "lng": null
      },
      "coordsConfidence": "low",
      "aspect": null,
      "windGood": [],
      "windDead": [],
      "depthMinM": 4,
      "depthMaxM": 15,
      "depthConfidence": "low",
      "structure": "shelf-to-basin transition along the walls of the glacial trough",
      "substrate": "rock (inferred)",
      "species": [
        "brown trout",
        "sonaghan",
        "ferox"
      ],
      "waveGate": false,
      "seasonBest": [
        "Jun",
        "Jul",
        "Aug"
      ],
      "notes": "PERSONALLY PRODUCTIVE: orange/claret and green/green boobies worked the mid-deep band off the drop-offs during the June 2026 recon - two pulls, 3-7 second pause, then long slow pulls, takes on the pause. Ferox patrol these edges hunting sonaghan.",
      "confidence": "low",
      "confidenceNote": "The TACTIC is high confidence (personally verified). The GEOMETRY is low confidence - drop-off positions and angles are inferred from glacial ribbon-lake typology, not surveyed. This is the entry the i-Boating chart will improve most.",
      "source": [
        "RECON",
        "INFERRED"
      ]
    },
    {
      "id": "kilcoo-county-river-mouth",
      "name": "Kilcoo (County) River mouth",
      "bay": "south-east end",
      "jurisdiction": "border",
      "startPoint": {
        "lat": null,
        "lng": null
      },
      "endPoint": {
        "lat": null,
        "lng": null
      },
      "coordsConfidence": "low",
      "aspect": null,
      "windGood": [],
      "windDead": [],
      "depthMinM": null,
      "depthMaxM": null,
      "depthConfidence": "low",
      "structure": "inflow delta shelving to drop-off",
      "substrate": "gravel (inferred)",
      "species": [
        "salmon",
        "brown trout"
      ],
      "waveGate": false,
      "seasonBest": [
        "Jun",
        "Jul",
        "Aug",
        "Sep"
      ],
      "notes": "Marks the SE end of the fishery boundary between jurisdictions. Included as a structure type (inflow fan) rather than a named angling mark - verify it actually fishes before surfacing.",
      "confidence": "low",
      "source": [
        "ROSSINVER",
        "INFERRED"
      ]
    }
  ],
  "speciesRules": {
    "gillaroo": {
      "habitat": "close in to rocky shores and around the sunken islands",
      "diet": "molluscs, sedge larvae, freshwater shrimp - benthic for most of the season",
      "waveGate": true,
      "waveGateNote": "A good wave is normally needed before gillaroo come to the fly. Below that threshold, demote all gillaroo drifts.",
      "depthBandM": [
        0,
        4
      ],
      "confidence": "high",
      "source": [
        "IFI",
        "WIKISHIRE"
      ],
      "lateSummerException": {
        "months": [
          8,
          9
        ],
        "behaviour": "come to the surface to feed and may be caught on the dry fly",
        "waveGate": false,
        "depthBandM": [
          0,
          1
        ],
        "method": "single dry - Green Peter Dry sz 10 or Dry Daddy sz 10, static or smallest twitch",
        "note": "This is the exception, not the rule. It applies in late summer only. Very few competition boats fish dry for gillaroo.",
        "confidence": "med",
        "confidenceNote": "Sourced from published descriptions of gillaroo feeding behaviour, not from personal observation. Verify on the practice day (Thu 27 Aug) before committing competition time to it.",
        "source": "WIKISHIRE/IFI"
      },
      "seasonalOverride": {
        "default": {
          "waveGate": true,
          "depthBandM": [
            0,
            4
          ],
          "method": "wet team drawn off the shallow into deeper water"
        },
        "aug_sep": {
          "waveGate": false,
          "depthBandM": [
            0,
            1
          ],
          "method": "single dry over the same structure; keep the wet team as fallback"
        }
      },
      "appAction": "If month is 8 or 9, apply lateSummerException: drop the wave gate from a hard filter to a soft preference, and surface the dry-fly option alongside the wet team. Do NOT demote gillaroo drifts in flat calm during Aug-Sep as you would in June."
    },
    "sonaghan": {
      "habitat": "open deep water, taken close to the surface",
      "diet": "daphnia, midge pupae, Chaoborus",
      "waveGate": false,
      "depthBandM": [
        0,
        3
      ],
      "overDepthM": [
        12,
        45
      ],
      "note": "Fished near the surface OVER deep water. Distribution follows daphnia concentration, which is light- and wind-driven.",
      "confidence": "high",
      "source": [
        "IFI",
        "ROSSINVER"
      ],
      "lightRule": "prefer low light; high sun pushes them into the depths",
      "stratificationNote": "By late Aug the lake is strongly stratified over the deep basin. Trout are confined above the thermocline; water below is oxygen-depleted. The productive count-down band sits DEEPER and SHARPER than in June. Stratification applies only over the deep basin and outer drop-offs - most of the lough is too shallow to stratify.",
      "stratificationConfidence": "low - no published temperature profile exists for Melvin. Depths are typical for a lake of this size and latitude, not measured. Take surface and count-down temp readings on the practice day."
    },
    "ferox": {
      "habitat": "deep basin edges and drop-off walls",
      "diet": "fish - sonaghan and char",
      "method": "mostly taken trolling; rarely to the fly",
      "confidence": "med",
      "source": "IFI"
    },
    "brownTrout": {
      "habitat": "general - margins to open water",
      "confidence": "high",
      "source": "IFI"
    },
    "salmon": {
      "habitat": "caught anywhere on the lough; Rossinver Bay is the premium fly area",
      "seasonOpen": "01 Feb",
      "note": "Grilse run begins June; fish taken all over from Kinlough to Rossinver.",
      "confidence": "high",
      "source": [
        "IFI",
        "ROSSINVER"
      ]
    }
  },
  "fieldTasks_Aug2026": [
    {
      "priority": 1,
      "task": "GPS-mark the sunken islands and record depth-over the crown and the shoulder.",
      "day": "Thu 27 Aug"
    },
    {
      "priority": 1,
      "task": "Test the gillaroo dry-fly hypothesis over the sunken islands and island fringes. If it works, it is a competition edge few boats will be using.",
      "day": "Thu 27 Aug"
    },
    {
      "priority": 2,
      "task": "Ground-truth i-Boating contours against the sounder at 4 known points. If they match, trust the chart; if not, discard it.",
      "day": "Thu 27 Aug"
    },
    {
      "priority": 3,
      "task": "Record aspect + wind behaviour for every drift fished - which shore the wind actually stacked into.",
      "day": "Thu 27 + Sat 29 Aug"
    },
    {
      "priority": 4,
      "task": "Locate the Rosskit stone ridge and mark both ends.",
      "day": "Sat 29 Aug"
    },
    {
      "priority": 5,
      "task": "Resolve 'Church Island' vs Inishtemple locally (Sean Maguire's, Garrison).",
      "day": "any"
    },
    {
      "priority": 6,
      "task": "Mark the two Rossinver red buoys so the fly-only polygon is real rather than described.",
      "day": "any"
    },
    {
      "priority": 7,
      "task": "Take surface temp and a count-down temp over the deep basin to find the real thermocline depth. Ten minutes of work replaces an estimate.",
      "day": "Thu 27 Aug"
    }
  ]
};
