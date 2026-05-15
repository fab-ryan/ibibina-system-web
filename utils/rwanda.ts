import locationData from "./locations.json";

type LocationData = Record<
  string,
  Record<string, Record<string, Record<string, string[]>>>
>;
const locationRwanda = locationData as LocationData;

interface Option {
  label: string;
  value: string;
}

export const getProvinces = (): Option[] => {
  return Object.keys(locationRwanda).map((province) => ({
    label: province,
    value: province,
  }));
};

export const getDistricts = (province: string): Option[] => {
  const districts = locationRwanda[province];
  if (!districts) return [];
  return Object.keys(districts).map((district) => ({
    label: district,
    value: district,
  }));
};

export const getSectors = (province: string, district: string): Option[] => {
  const sectors = locationRwanda[province]?.[district];
  if (!sectors) return [];
  return Object.keys(sectors).map((sector) => ({
    label: sector,
    value: sector,
  }));
};

export const getCells = (
  province: string,
  district: string,
  sector: string,
): Option[] => {
  const cells = locationRwanda[province]?.[district]?.[sector];
  if (!cells) return [];
  return Object.keys(cells).map((cell) => ({
    label: cell,
    value: cell,
  }));
};

export const getVillages = (
  province: string,
  district: string,
  sector: string,
  cell: string,
): Option[] => {
  const villages = locationRwanda[province]?.[district]?.[sector]?.[cell];
  if (!villages) return [];
  return villages.map((village) => ({
    label: village,
    value: village,
  }));
};
