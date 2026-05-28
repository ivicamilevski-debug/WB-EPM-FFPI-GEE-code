//Imports
var hiHydroSoil = ee.Image('projects/ee-ivicamilevski/assets/Ksat_0-5cm_Balkan-UTM2');
var glo30 = ee.Image('projects/ee-ivicamilevski/assets/WB-GLO30');
var basins = ee.FeatureCollection('projects/ee-ivicamilevski/assets/WB-Validacija');
var Gorna = ee.FeatureCollection('projects/ee-ivicamilevski/assets/Gorna-bregalnica');
var bsi = ee.Image('projects/ee-ivicamilevski/assets/WB-BSI');
var wb = ee.FeatureCollection('projects/ee-ivicamilevski/assets/Western-Balkan-Border2');

//Borders
var dataset = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017');
var Alb = dataset.filter(ee.Filter.eq('country_na', 'Albania'));
var Mac = dataset.filter(ee.Filter.eq('country_na', 'Macedonia'));
var Ser = dataset.filter(ee.Filter.eq('country_na', 'Serbia'));
var Mon = dataset.filter(ee.Filter.eq('country_na', 'Montenegro'));
var BiH = dataset.filter(ee.Filter.eq('country_na', 'Bosnia and Herzegovina'));
var Kos = dataset.filter(ee.Filter.eq('country_na', 'Kosovo'));
var WBCountries = dataset.filter(ee.Filter.inList('country_na', [
  'Albania', 'Bosnia and Herzegovina', 'Kosovo',
  'Macedonia', 'Montenegro', 'Serbia',
]));
var Serbia = dataset.filter(ee.Filter.inList('country_na', [
  'Kosovo','Serbia',]));

// Center the map
Map.setCenter(22.88599, 41.8117, 13); // longitude, latitude, zoom level

// Load SoilGrids
var soilGrids = ee.Image('projects/soilgrids-isric/clay_mean')
  .addBands(ee.Image('projects/soilgrids-isric/sand_mean'))
  .addBands(ee.Image('projects/soilgrids-isric/silt_mean'))
  .addBands(ee.Image('projects/soilgrids-isric/soc_mean'))
  .select(['clay_0-5cm_mean', 'sand_0-5cm_mean', 'silt_0-5cm_mean', 'soc_0-5cm_mean'])
  .clip(wb);

// Calculate K-factor components
var clay = soilGrids.select('clay_0-5cm_mean').divide(10).clip(wb); // Convert dg/kg to %
var sand = soilGrids.select('sand_0-5cm_mean').divide(10);
var silt = soilGrids.select('silt_0-5cm_mean').divide(10);
var soc = soilGrids.select('soc_0-5cm_mean').divide(10); // g/kg to %
var omm = soc.multiply(1.724).unmask(1.5).clip(wb); // Organic matter (%)
var om = omm.divide(40);

// Assume very fine sand is ~20% of sand (adjust based on local data)
var vfs = sand.multiply(0.2);
var m = silt.add(vfs).multiply(ee.Image(100).subtract(clay));

// Estimate structure (S) and permeability (P) - simplified example
var structure = clay.expression(
  'clay < 15 ? 1 : clay < 30 ? 2 : clay < 40 ? 3 : 4', { 'clay': clay }
).clip(wb);
var permeability = hiHydroSoil.expression(
  'ksat > 300 ? 1 : ksat > 200 ? 2 : ksat > 100 ? 3 : ksat > 50 ? 4 : 5', { 'ksat': hiHydroSoil }
).clip(wb);

// K-factor equation (USLE, in t ha h ha^-1 MJ^-1 mm^-1)
var kFactor = m.expression(
  '(2.1e-4 * pow(m, 1.14) * (12 - om) + 3.25 * (s - 2) + 2.5 * (p - 3)) / 100',
  { 'm': m, 'om': om, 's': structure, 'p': permeability }
).rename('K_factor')
 .multiply(25)
 .clamp(0, 9);

var suscept = hiHydroSoil.expression(
  '1/(ksat + 1)', // Low Ksat = high susceptibility
  { 'ksat': hiHydroSoil }
).multiply(100).clamp(0.1, 1).clip(wb).rename('ksat'); // 0 (low risk) to 1 (high risk)

var susceptibility = ee.Image(1).subtract(suscept).multiply(10);
var suscep = suscept.multiply(10);
var ksat = hiHydroSoil.rename("ksat");

// Fallback K-factor (simplified, Ksat-driven)
var avgClay = 20; // Average for Kosovo (%)
var avgSilt = 30;
var avgSand = 50;
var avgSoc = 1;
var avgOm = avgSoc * 1.724;
var avgVfs = avgSand * 0.05;
var avgM = (avgSilt + avgVfs) * (100 - avgClay);
var avgStructure = avgClay < 15 ? 1 : avgClay < 30 ? 2 : avgClay < 40 ? 3 : 4;
var kFactorFallback = hiHydroSoil.expression(
  '2.1e-4 * pow(avgM, 1.14) * (12 - avgOm) + 3.25 * (avgS - 2) + 2.5 * (p - 3)',
  {
    'ksat': ksat,
    'avgM': avgM,
    'avgOm': avgOm,
    'avgS': avgStructure,
    'p': ksat.expression('ksat > 1000 ? 1 : ksat > 500 ? 2 : ksat > 200 ? 3 : ksat > 50 ? 4 : ksat > 10 ? 5 : 6', {'ksat': ksat})
  }
).divide(4).clamp(0, 10).clip(wb);

// Unmask K-factor with fallback
var KFActor = kFactor.unmask(kFactorFallback);
var KFactor = KFActor.resample('bilinear')
  .setDefaultProjection({crs: KFActor.projection(), scale: 30});
var Clay = clay.divide(7).unmask(kFactorFallback).clamp(1,10);

// Visualization
var visParams = {min: 0, max: 10, palette: ['blue', 'green', 'yellow', 'red']};

// Visualization
var kVis = {min: 0, max: 10, palette: ['green', 'yellow', 'red']};
var mVis = {min: 1000, max: 6000, palette: ['green', 'yellow', 'red']};
var omVis = {min: 0, max: 12, palette: ['green', 'yellow', 'red']};
var sVis = {min: 1, max: 4, palette: ['green', 'yellow', 'red']};
var pVis = {min: 1, max: 4, palette: ['green', 'yellow', 'red']};

// 2. Land Cover (CLC-2018)
var landCover = ee.Image('COPERNICUS/CORINE/V20/100m/2018')
  .select('landcover')
  .clip(wb);
  
// Reclassify to erosion susceptibility weights
var clc = landCover.remap(
  [111, 112, 121, 122, 123, 124, 131, 132, 133, 141, 142, 211, 212, 213, 221, 222, 223, 231, 241, 242, 243, 244, 311, 312, 313, 321, 322, 323, 324, 331, 332, 333, 334, 335, 411, 412, 421, 422, 423, 511, 512, 521, 522, 523],
  [0.3, 0.3, 0.3, 0.5, 0.1, 0.1, 1.0, 1.0, 1.0, 0.2, 0.2, 0.6, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.6, 0.5, 0.6, 0.3, 0.2, 0.2, 0.2, 0.4, 0.4, 0.5, 0.5, 0.8, 0.6, 0.8, 0.8, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
  0.5 // Default
).multiply(10);
var landcover = clc.resample('bilinear')
  .setDefaultProjection({crs: clc.projection(), scale: 30});


//ESA WorldCover
var dataset = ee.ImageCollection('ESA/WorldCover/v200').first();
var visualization = {
  bands: ['Map'],
};
// Define land cover class values and their flood susceptibility ranks
var classValues = [10, 20, 30, 40, 50, 100, 60, 90, 80];
var susceptibilityRanks = [1, 3, 5, 6, 7, 8, 9, 8, 0];
// Remap land cover classes to flood susceptibility ranks
var WorldCover = dataset.remap(classValues, susceptibilityRanks);

//Carbonate rocks identification
var soilPh = ee.Image("OpenLandMap/SOL/SOL_PH-H2O_USDA-4C1A2A_M/v02")
  .select("b0").divide(12)
  .clip(wb)
  .resample('bilinear')
  .reproject({crs: 'EPSG:4326', scale: 30});

//calculate slope from GLO30-in assets;
var demNM = glo30.clip(wb);
var slopeDegrees = ee.Terrain.slope(demNM);
var slopePercent = slopeDegrees.expression(
  'tan(slope * 3.14159 / 180) * 100', {
    'slope': slopeDegrees
  });

var slopeClipped = slopePercent.clip(wb);
var slopeClip = slopeDegrees.clip(wb);

// Normalize layers to 1-10 range
var slopePercentN = slopeClipped.multiply(10).divide(30).clamp(1,10); // 0-50% -> 0-10

//Soil-clay factor
var CLay = Clay.multiply(1.5);
var CClay = CLay.resample('bilinear')
  .setDefaultProjection({crs: CLay.projection(), scale: 30});

// Create coefficient Z
var sqrtS = kFactor.divide(15).unmask(0.3).clip(wb); // √(susceptibility)
var KF = sqrtS.subtract(0.3);
//var SSand = sand.divide(100).unmask(0.25).clip(wb);
//var ssusceptibility = susceptibility.multiply(0.05);
var soilPhh = soilPh.divide(15).unmask(0.2).clip(wb);
//var ndvii = ee.Image(1).subtract(ndvi).multiply(0.5).rename('ndvii');
var sqrtSlope = slopeClipped.divide(15).sqrt(); // √(slopes in %)
var lcWeights = landcover.divide(10);
var fi2 = bsi.multiply(0.09).add(slopeClip.multiply(0.005));

// Normalisation for the coefficient fi 0-1
var k = 10;   
var m = 0.7;  

var fi = fi2.expression(
  '1 / (1 + exp(-k * (y - m)))', {
    'y': fi2,
    'k': k,
    'm': m
}).rename('fi');

var Y = sqrtS.add(soilPhh);

// Combine
var coefZ = Y.multiply(lcWeights).multiply(fi.add(sqrtSlope)).clamp(0,2).rename("coefZ");
var E = coefZ.multiply(5).clamp(1,9);

var ZClass = coefZ.expression(
  'coefZ > 0.99 ? 1 : coefZ > 0.7 ? 2 : coefZ > 0.4 ? 3 : coefZ > 0.2 ? 4 : coefZ > 0 ? 5:5', { 'coefZ': coefZ }
).clip(wb);

var susc = susceptibility.multiply(0.7);

// Create FFPI by averaging normalized layers
var bsiClipped = bsi;
var FFPI = slopePercentN
  .multiply(1.6)
  .add(bsiClipped.multiply(1.25))
  .add(KFactor)
  .add(CClay)
  .add(WorldCover.multiply(1.15))
  .add(E)
  .divide(6)
  .rename('Composite');

//Crate FFPI classes
var FFPIclass = FFPI.expression(
  'coefZ > 6.8 ? 1 : coefZ > 6.2 ? 2 : coefZ > 5.5 ? 3 : coefZ > 5.2 ? 4 : coefZ > 3 ? 5:5', { 'coefZ': FFPI }
).clip(wb);

var compositeVis = {min: 3, max: 9, palette: ['green', 'yellow', 'orange', 'red']};
var coefZVis = {min: 0, max: 1.4, palette: ['green', 'yellow', 'orange', 'red', "brown"]};
var coefZClVis = {min: 1, max: 5, palette: ["brown",'red', 'orange', 'yellow','green']};
var FFPIVis = {min: 1, max: 5, palette: ['red', 'orange', 'yellow', "lightgreen",'green']};

// Mean values-Kolubara
var kolubara = basins.filter(ee.Filter.eq('NAME', 'Kolubara'));
Map.addLayer(kolubara, {}, 'Kolubara basins', false);
var meanKolubara = coefZ.reduceRegion({
reducer: ee.Reducer.mean(),
geometry: kolubara.geometry(),   
scale: 30,
maxPixels: 1e13,
tileScale: 4
});
print('Mean coefZ (Kolubara):', meanKolubara.get('coefZ'));

// Mean values-Ukrina
var ukrina = basins.filter(ee.Filter.eq('NAME', 'Ukrina'));
//Map.addLayer(ukrina, {}, 'Ukrina basins', false);
var meanUkrina = coefZ.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: ukrina.geometry(),   
  scale: 30,
  maxPixels: 1e13,
  tileScale: 4
});
print('Mean coefZ (Ukrina):', meanUkrina.get('coefZ'));

// Mean values-Vrbas
var vrbas = basins.filter(ee.Filter.eq('NAME', 'Vrbas'));
Map.addLayer(vrbas, {}, 'Vrbas basins', false);
var meanVrbas = coefZ.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: vrbas.geometry(),   // ги зема сите полигони како една геометрија
  scale: 30,
  maxPixels: 1e13,
  tileScale: 4
});
print('Mean coefZ (Vrbas):', meanVrbas.get('coefZ'));

// Mean values-Bregalnica
var meanGorna = coefZ.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: Gorna.geometry(),   // ги зема сите полигони како една геометрија
  scale: 30,
  maxPixels: 1e13,
  tileScale: 4
});
print('Mean coefZ (Gorna_Breg):', meanGorna.get('coefZ'));

// Mean values-North Macedonia
var meanMk = coefZ.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: Mac.geometry(),   // ги зема сите полигони како една геометрија
  scale: 30,
  maxPixels: 1e13,
  tileScale: 4
});
print('Mean coefZ (Macedonia):', meanMk.get('coefZ'));

// Add layers to the map
//Map.addLayer(demNM, elevVisParams, 'Elevation (m)');
//Map.addLayer(slopeDegrees, slopeDegVisParams, 'Slope (degrees)');
//Map.addLayer(slopeClipped, kVis, 'Slope (percent)');
//Map.addLayer(lithos, lithologyVisParams, 'Lithology index');
//Map.addLayer(bsiClipped, bsiVis, 'BSI Median 2020-2023 (1-10)');
//Map.addLayer(CClay, landcVis, 'Clay');
//Map.addLayer(KFactor, kVis, 'K-factor');
//Map.addLayer(susc, compositeVis, 'FFPI');
//Map.addLayer(permeability, pVis, 'Permeability');
//Map.addLayer(m, mVis, 'm');
//Map.addLayer(soilPhh, coefZVis, 'soilPH');
//Map.addLayer(SSand, coefZVis, 'ndvi');
//Map.addLayer(Y, coefZVis, 'Y');
//Map.addLayer(fi, coefZVis, 'fi');
Map.addLayer(FFPI, compositeVis, 'FFPI-Class');
Map.addLayer(FFPIclass, FFPIVis, 'FFPI-Class');
Map.addLayer(coefZ, coefZVis, 'Coeff-Z-EPM');
Map.addLayer(ZClass, coefZClVis, 'ZClass');

// Export coeff-Z
Export.image.toDrive({
  image : coefZ,
  description : 'CoeffZ',
  scale : 30,
  region : wb,
  folder : 'GEE',
  maxPixels : 1e10,
  crs: 'EPSG:4326',
});

// Export FFPI
Export.image.toDrive({
  image : FFPI,
  description : 'FFPI',
  scale : 30,
  region : wb,
  folder : 'GEE',
  maxPixels : 1e10,
  crs: 'EPSG:4326',
});

// Export FFPI-classes
Export.image.toDrive({
  image : FFPIclass,
  description : 'FFPIclass',
  scale : 30,
  region : wb,
  folder : 'GEE',
  maxPixels : 1e10,
  crs: 'EPSG:4326',
});
