# Google Earth Engine Script for Regional EPM and FFPI Assessment in the Western Balkans

## Overview
This repository/archive contains the Google Earth Engine (GEE) script used for regional-scale assessment of soil erosion susceptibility and flash-flood susceptibility in the Western Balkans.

The workflow combines:
- a modified **Erosion Potential Model (EPM)** for erosion susceptibility assessment, expressed through the erosion coefficient **Z** (`coefZ`), and
- a **Flash Flood Potential Index (FFPI)** approach for flash-flood susceptibility mapping.

The script is designed for large-area, cloud-based geospatial processing in the GEE JavaScript environment and supports regional-scale screening, basin prioritization, and comparison with selected validation basins.

## Related Manuscript
This script accompanies the manuscript:

**Milevski, I., Aleksova, B., Dragićević, S., Tošić, R., Vujović, F., Durlević, U., & Valjarević, A.**  
*Soil erosion and flash floods susceptibility assessment on the regional scale: a case study of the Western Balkans.*

The manuscript presents a regional assessment of soil erosion susceptibility and flash-flood susceptibility across the Western Balkans using a cloud-based workflow implemented in Google Earth Engine.

## Study Area
The script is prepared for the **Western Balkans**, covering approximately **208,052 km²** in southeastern Europe.

## Main Purpose of the Script
The script performs:
1. regional preparation of terrain, soil, land-cover, vegetation, and basin datasets;
2. estimation of soil-related erodibility parameters;
3. calculation of the modified EPM erosion coefficient (`coefZ`);
4. calculation of the FFPI composite susceptibility index;
5. classification of erosion susceptibility and flash-flood susceptibility;
6. extraction of mean values for selected validation basins;
7. export of final raster outputs to Google Drive.

## Earth Engine Custom Assets Used
The script uses the following imported Earth Engine assets:

- `projects/ee-ivicamilevski/assets/Ksat_0-5cm_Balkan-UTM2`
- `projects/ee-ivicamilevski/assets/WB-GLO30`
- `projects/ee-ivicamilevski/assets/WB-Validacija`
- `projects/ee-ivicamilevski/assets/Gorna-bregalnica`
- `projects/ee-ivicamilevski/assets/WB-BSI`
- `projects/ee-ivicamilevski/assets/Western-Balkan-Border2`

These custom assets are referenced directly in the script. Access was granted for review and reproducibility purposes.

## Public Datasets Used
In addition to the imported assets, the script uses public datasets available through Google Earth Engine, including:

- **USDOS/LSIB_SIMPLE/2017** – country borders
- **SoilGrids** – clay, sand, silt, and soil organic carbon
- **COPERNICUS/CORINE/V20/100m/2018** – CORINE Land Cover 2018
- **ESA/WorldCover/v200** – ESA WorldCover
- **OpenLandMap soil pH** – soil pH proxy layer

## Main Methodological Components

### 1. Erosion Susceptibility Component (Modified EPM)
The erosion-related part of the script estimates a modified erosion susceptibility coefficient (`coefZ`) based on:
- soil erodibility (`K-factor`),
- soil texture / clay factor,
- land-cover weighting,
- bare-soil/vegetation signal,
- terrain slope,
- and a proxy-based erodibility formulation.

The script also creates:
- `ZClass` – classified erosion susceptibility map.

### 2. Flash-Flood Susceptibility Component (FFPI)
The flash-flood susceptibility component calculates a composite **FFPI** using:
- slope,
- bare soil / vegetation signal,
- K-factor,
- clay-related soil contribution,
- WorldCover-derived land-cover weighting,
- and the erosion-related coefficient `E`.

The script also creates:
- `FFPI` – continuous FFPI raster,
- `FFPIclass` – classified FFPI map.

## Validation / Basin Checks Included in the Script
The script calculates mean `coefZ` values for selected basins or regions:

- **Kolubara**
- **Ukrina**
- **Vrbas**
- **Gorna Bregalnica**
- **North Macedonia**

These calculations are used to support comparison with previous studies and regional validation analyses.

## Main Outputs
The script visualizes and/or exports the following main outputs:

### Visualized layers
- `FFPI`
- `FFPIclass`
- `coefZ`
- `ZClass`

### Exported layers
The following rasters are exported to Google Drive:
- `CoeffZ`
- `FFPI`
- `FFPIclass`

Export settings:
- spatial resolution: **30 m**
- projection: **EPSG:4326**
- export destination: **Google Drive / GEE folder**

## Script Structure
The `.js` script is organized into the following parts:

1. **Imports**
2. **Study-area and border preparation**
3. **SoilGrids loading and K-factor calculation**
4. **Land-cover and WorldCover processing**
5. **Soil pH and slope derivation**
6. **Modified EPM coefficient calculation**
7. **FFPI calculation**
8. **Basin-based mean value extraction**
9. **Map visualization**
10. **Export to Google Drive**

## Software Environment
- **Platform:** Google Earth Engine Code Editor
- **Language:** JavaScript

## How to Run
1. Open the Google Earth Engine Code Editor.
2. Upload or paste the script into the editor.
3. Ensure that the imported custom assets are accessible.
4. Run the script.
5. Review map outputs in the GEE interface.
6. Start the export tasks manually from the **Tasks** tab in GEE.

## Notes on Reproducibility
This script is shared to support transparency, review, and reproducibility of the regional methodology.  
Some layers are derived from custom Earth Engine assets prepared specifically for the study area.  
Public datasets are called directly from the Earth Engine catalog, while region-specific assets are referenced explicitly in the script.

## Repository Contents
Suggested repository/archive structure:

- `WB-GEE-script.js` – main Google Earth Engine script
- `README.md` – project description and usage notes
- `LICENSE` – optional license file
- `Manuscript-IM.docx` – related manuscript (optional, if included in the archive)

## Suggested Citation
If you use or refer to this code, please cite the related manuscript and acknowledge the original author.

Suggested format:

**Milevski, I.** Google Earth Engine script for regional EPM and FFPI assessment in the Western Balkans.  
Associated with the manuscript: *Soil erosion and flash floods susceptibility assessment on the regional scale: a case study of the Western Balkans*.

## Contact
**Prof. Ivica Milevski**  
Institute of Geography  
Faculty of Natural Sciences and Mathematics  
Ss. Cyril and Methodius University in Skopje  
North Macedonia  
Email: ivica@pmf.ukim.mk

## License
This code is shared for academic review, transparency, and reproducibility purposes.  
Please contact the author if you intend to reuse, adapt, or publish derivative versions of the script.