import xarray as xr
import pandas as pd 
DS = xr.open_dataset("nodc_D53546_013.nc")
data = DS.to_dataframe()
columns = [
    "platform_number", "project_name",
    "pi_name", "station_parameters", "cycle_number", 
    "data_centre", "data_mode", "float_serial_no",
    "firmware_version", "platform_type", "juld", 
    "latitude", "longitude", "positioning_system", 
    "pres", "pres_qc", "pres_adjusted", "pres_adjusted_qc", 
    "temp", "temp_qc", "temp_adjusted", "temp_adjusted_qc",
    "psal", "psal_qc", "psal_adjusted", "psal_adjusted_qc",
    "scientific_calib_equation", "scientific_calib_coefficient", "scientific_calib_comment", "history_software"
]
data = data[columns]
data = data[columns].drop_duplicates()
platform_number = data["platform_number"].iloc[0].decode("utf-8").strip()
project_name = data["project_name"].iloc[0].decode("utf-8").strip()
pi_name = data["pi_name"].iloc[0].decode("utf-8").strip()
cycle_num = data["cycle_number"].iloc[0]
data_center = str(data["data_centre"].iloc[0])[2:-1]
data_mode = data["data_mode"].iloc[0].decode("utf-8").strip()
float_no = data["float_serial_no"].iloc[0].decode("utf-8").strip()
firmware = data["firmware_version"].iloc[0].decode("utf-8").strip()
platform_type = data["platform_type"].iloc[0].decode("utf-8").strip()
juld = str(data["juld"].iloc[0])
latitude = data["latitude"].iloc[0]
longitude = data["longitude"].iloc[0]
position_sys = data["positioning_system"].iloc[0].decode("utf-8").strip()

def parse_qc(series):
    return pd.to_numeric(series.astype(str).str.extract(r'(\d)').squeeze(), errors="coerce")

data["pres_qc_num"] = parse_qc(data["pres_qc"])
data["pres_adj_qc_num"] = parse_qc(data["pres_adjusted_qc"])
mask = (
    data["pres_adjusted"].notna()
    & data["pres_adj_qc_num"].isin([1, 2])
    & (data["pres_qc_num"].isna() | (data["pres_adj_qc_num"] >= data["pres_qc_num"]))
)
data.loc[mask, "pres"] = data.loc[mask, "pres_adjusted"]

data["temp_qc_num"] = parse_qc(data["temp_qc"])
data["temp_adj_qc_num"] = parse_qc(data["temp_adjusted_qc"])

mask = (
    data["temp_adjusted"].notna()
    & data["temp_adj_qc_num"].isin([1, 2])
    & (data["temp_qc_num"].isna() | (data["temp_adj_qc_num"] >= data["temp_qc_num"]))
)
data.loc[mask, "temp"] = data.loc[mask, "temp_adjusted"]

data["psal_qc_num"] = parse_qc(data["psal_qc"])
data["psal_adj_qc_num"] = parse_qc(data["psal_adjusted_qc"])

mask = (
    data["psal_adjusted"].notna()
    & data["psal_adj_qc_num"].isin([1, 2])
    & (data["psal_qc_num"].isna() | (data["psal_adj_qc_num"] >= data["psal_qc_num"]))
)
data.loc[mask, "psal"] = data.loc[mask, "psal_adjusted"]

data['station_parameters'] = data['station_parameters'].apply(
    lambda x: x.decode('utf-8').strip().split()
    if isinstance(x, (bytes, bytearray)) else str(x).strip().split()
)
data['scientific_calib_coefficient'] = data['scientific_calib_coefficient'].apply(
    lambda x: x.decode('utf-8').strip().split()
    if isinstance(x, (bytes, bytearray)) else str(x).strip().split()
)
data['scientific_calib_equation'] = data['scientific_calib_equation'].apply(
    lambda x: x.decode('utf-8').strip().split()
    if isinstance(x, (bytes, bytearray)) else str(x).strip().split()
)
data['scientific_calib_comment'] = data['scientific_calib_comment'].apply(
    lambda x: x.decode('utf-8').strip().split()
    if isinstance(x, (bytes, bytearray)) else str(x).strip().split()
)
data['history_software'] = data['history_software'].apply(
    lambda x: x.decode('utf-8').strip().split()
    if isinstance(x, (bytes, bytearray)) else str(x).strip().split()
)
data = data.drop(columns=[
    "platform_number", "project_name", "pi_name", "cycle_number", "data_centre", "data_mode",
    "float_serial_no", "firmware_version", "platform_type", "juld", "latitude", "longitude", "positioning_system",
    "pres_adjusted", "pres_qc", "pres_adjusted_qc", "pres_qc_num", "pres_adj_qc_num",
    "temp_adjusted", "temp_qc", "temp_adjusted_qc", "temp_qc_num", "temp_adj_qc_num",
    "psal_adjusted", "psal_qc", "psal_adjusted_qc", "psal_qc_num", "psal_adj_qc_num"
], axis=1)

data.to_csv("sample6.csv")



