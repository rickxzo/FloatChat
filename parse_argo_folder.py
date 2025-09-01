import os
import requests
from bs4 import BeautifulSoup
from pathlib import Path
import pandas as pd
import xarray as xr
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
import json

# ---------- CONFIG ----------
URL = "https://www.ncei.noaa.gov/data/oceans/argo/gadr/data/atlantic/2020/02/"
ARGO_DIR = Path("argo_data")             # folder to save downloaded files
CONNECTION_URL = "sqlite:///app.db"     # database
# ---------------------------

os.makedirs(ARGO_DIR, exist_ok=True)
Base = declarative_base()

def as_json(v):
    return json.dumps(v if isinstance(v, (list, tuple)) else [v])

# ---------- MODELS ----------
class Data(Base):
    __tablename__ = "Data"
    id = Column(Integer, primary_key=True)
    platform_number = Column(Integer)
    project_name = Column(String)
    pi_name = Column(String)
    cycle_num = Column(Integer)
    data_centre = Column(String)
    data_mode = Column(String)
    float_no = Column(Integer)
    firmware = Column(Integer)
    platform_type = Column(String)
    juld = Column(DateTime)
    latitude = Column(Float)
    longitude = Column(Float)
    position_system = Column(String)
    observations = relationship("Observation", back_populates="data", cascade="all, delete-orphan")

class Observation(Base):
    __tablename__ = "Observation"
    id = Column(Integer, primary_key=True)
    data_id = Column(Integer, ForeignKey("Data.id", ondelete="CASCADE"), index=True)
    pressure = Column(Float)
    temp = Column(Float)
    psal = Column(Float)
    station_param = Column(Text)
    equation = Column(Text)
    coefficient = Column(Text)
    comment = Column(Text)
    history_software = Column(Text)
    data = relationship("Data", back_populates="observations")

# ---------- HELPERS ----------
def download_argo_files():
    """Download all .nc files from the NOAA Argo directory into ARGO_DIR."""
    print(f"Fetching file list from {URL}")
    response = requests.get(URL)
    response.raise_for_status()

    from bs4 import BeautifulSoup
    soup = BeautifulSoup(response.text, "html.parser")
    links = [a['href'] for a in soup.find_all('a') if a['href'].endswith('.nc')]

    for link in links:
        file_url = URL + link
        file_path = ARGO_DIR / link
        if file_path.exists():
            print(f"Already downloaded: {file_path}")
            continue
        print(f"Downloading {file_url}")
        with requests.get(file_url, stream=True) as r:
            r.raise_for_status()
            with open(file_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)

def parse_qc(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series.astype(str).str.extract(r'(\d)').squeeze(), errors="coerce")

def load_and_clean(nc_path: Path):
    DS = xr.open_dataset(nc_path)
    df = DS.to_dataframe().reset_index(drop=True)

    cols = [
        "platform_number", "project_name", "pi_name", "station_parameters", "cycle_number",
        "data_centre", "data_mode", "float_serial_no", "firmware_version",
        "platform_type", "juld", "latitude", "longitude", "positioning_system",
        "pres", "pres_qc", "pres_adjusted", "pres_adjusted_qc",
        "temp", "temp_qc", "temp_adjusted", "temp_adjusted_qc",
        "psal", "psal_qc", "psal_adjusted", "psal_adjusted_qc",
        "scientific_calib_equation", "scientific_calib_coefficient",
        "scientific_calib_comment", "history_software"
    ]
    df = df[cols].drop_duplicates()

    def dec(s):
        return s.decode("utf-8").strip() if isinstance(s, (bytes, bytearray)) else str(s).strip()

    meta = {
        "platform_number": int(df["platform_number"].iloc[0]),
        "project_name": dec(df["project_name"].iloc[0]),
        "pi_name": dec(df["pi_name"].iloc[0]),
        "cycle_num": int(df["cycle_number"].iloc[0]),
        "data_centre": dec(df["data_centre"].iloc[0]),
        "data_mode": dec(df["data_mode"].iloc[0]),
        "float_no": int(df["float_serial_no"].iloc[0]),
        "firmware": int(df["firmware_version"].iloc[0]) if str(df["firmware_version"].iloc[0]).isdigit() else None,
        "platform_type": dec(df["platform_type"].iloc[0]),
        "juld": pd.to_datetime(str(df["juld"].iloc[0]), errors="coerce"),
        "latitude": float(df["latitude"].iloc[0]),
        "longitude": float(df["longitude"].iloc[0]),
        "position_system": dec(df["positioning_system"].iloc[0]),
    }

    # ---- QC adjustments ----
    df["pres_qc_num"] = parse_qc(df["pres_qc"])
    df["pres_adj_qc_num"] = parse_qc(df["pres_adjusted_qc"])
    mask = (
        df["pres_adjusted"].notna()
        & df["pres_adj_qc_num"].isin([1, 2])
        & (df["pres_qc_num"].isna() | (df["pres_adj_qc_num"] >= df["pres_qc_num"]))
    )
    df.loc[mask, "pres"] = df.loc[mask, "pres_adjusted"]

    df["temp_qc_num"] = parse_qc(df["temp_qc"])
    df["temp_adj_qc_num"] = parse_qc(df["temp_adjusted_qc"])
    mask = (
        df["temp_adjusted"].notna()
        & df["temp_adj_qc_num"].isin([1, 2])
        & (df["temp_qc_num"].isna() | (df["temp_adj_qc_num"] >= df["temp_qc_num"]))
    )
    df.loc[mask, "temp"] = df.loc[mask, "temp_adjusted"]

    df["psal_qc_num"] = parse_qc(df["psal_qc"])
    df["psal_adj_qc_num"] = parse_qc(df["psal_adjusted_qc"])
    mask = (
        df["psal_adjusted"].notna()
        & df["psal_adj_qc_num"].isin([1, 2])
        & (df["psal_qc_num"].isna() | (df["psal_adj_qc_num"] >= df["psal_qc_num"]))
    )
    df.loc[mask, "psal"] = df.loc[mask, "psal_adjusted"]

    def to_list(col):
        return df[col].apply(lambda x: dec(x).split() if isinstance(x, (bytes, bytearray)) else str(x).strip().split())

    df['station_parameters'] = to_list('station_parameters')
    df['scientific_calib_coefficient'] = to_list('scientific_calib_coefficient')
    df['scientific_calib_equation']    = to_list('scientific_calib_equation')
    df['scientific_calib_comment']     = to_list('scientific_calib_comment')
    df['history_software']             = to_list('history_software')

    obs = df.drop(columns=[
        "platform_number", "project_name", "pi_name", "cycle_number", "data_centre", "data_mode",
        "float_serial_no", "firmware_version", "platform_type", "juld", "latitude", "longitude", "positioning_system",
        "pres_adjusted", "pres_qc", "pres_adjusted_qc", "pres_qc_num", "pres_adj_qc_num",
        "temp_adjusted", "temp_qc", "temp_adjusted_qc", "temp_qc_num", "temp_adj_qc_num",
        "psal_adjusted", "psal_qc", "psal_adjusted_qc", "psal_qc_num", "psal_adj_qc_num"
    ], axis=1)

    return meta, obs

# ---------- MAIN ----------
def main():
    # Step 1. Download
    download_argo_files()

    # Step 2. Parse + Insert
    engine = create_engine(CONNECTION_URL, future=True)
    Session = sessionmaker(bind=engine, expire_on_commit=False)

    files = sorted(p for p in ARGO_DIR.rglob("*.nc"))
    if not files:
        print(f"No .nc files found in {ARGO_DIR.resolve()}")
        return

    with Session() as session:
        for i, f in enumerate(files, 1):
            try:
                print(f"[{i}/{len(files)}] Processing {f} ...")
                meta, obs_df = load_and_clean(f)

                data_row = Data(**meta)
                session.add(data_row)
                session.flush()

                to_insert = []
                for _, r in obs_df.iterrows():
                    to_insert.append(Observation(
                        data_id=data_row.id,
                        pressure=float(r["pres"]) if pd.notna(r["pres"]) else None,
                        temp=float(r["temp"]) if pd.notna(r["temp"]) else None,
                        psal=float(r["psal"]) if pd.notna(r["psal"]) else None,
                        station_param=as_json(r["station_parameters"]),
                        equation=as_json(r["scientific_calib_equation"]),
                        coefficient=as_json(r["scientific_calib_coefficient"]),
                        comment=as_json(r["scientific_calib_comment"]),
                        history_software=as_json(r["history_software"]),
                    ))
                session.bulk_save_objects(to_insert)
                session.commit()
                print(f"  -> inserted {len(to_insert)} observations.")
            except Exception as e:
                session.rollback()
                print(f"  !! error on {f.name}: {e}")

if __name__ == "__main__":
    main()
