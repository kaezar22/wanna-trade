# Genera src/lib/indicators/__fixtures__/tradex-reference.json con el código
# original de tradex (Python). Uso:
#   git clone https://github.com/kaezar22/tradex /tmp/tradex
#   pip install pandas numpy plotly
#   python scripts/make_tradex_fixture.py src/lib/indicators/__fixtures__/tradex-reference.json
import json, sys, math
import numpy as np, pandas as pd
sys.path.insert(0, "/tmp/tradex")
from models.cz import chop_zone
from models.ichimoku import ichimoku_cloud
from models.bollinger import compute_bollinger_bands

rng = np.random.default_rng(42)
n = 320
drift = np.concatenate([np.full(80, 0.004), np.full(80, -0.005), np.full(80, 0.0), np.full(80, 0.006)])
close = 100 * np.cumprod(1 + drift + rng.normal(0, 0.012, n))
open_ = close * (1 + rng.normal(0, 0.004, n))
high = np.maximum(open_, close) * (1 + np.abs(rng.normal(0, 0.006, n)))
low = np.minimum(open_, close) * (1 - np.abs(rng.normal(0, 0.006, n)))
idx = pd.bdate_range("2023-01-02", periods=n)
df = pd.DataFrame({"Open": open_, "High": high, "Low": low, "Close": close, "Volume": 1000}, index=idx)

def ser(s): return [None if (x is None or (isinstance(x, float) and math.isnan(x))) else float(x) for x in s]

bb = compute_bollinger_bands(df)
ich = ichimoku_cloud(df)
cz = chop_zone(df)
other = 100 * np.cumprod(1 + rng.normal(0.0005, 0.01, n))
r = df["Close"].pct_change().dropna()
out = {
  "high": ser(df.High), "low": ser(df.Low), "close": ser(df.Close), "other": ser(other),
  "sma9": ser(df.Close.rolling(9).mean()), "sma21": ser(df.Close.rolling(21).mean()),
  "ema34": ser(df.Close.ewm(span=34, min_periods=34, adjust=False).mean()),
  "bb_mid": ser(bb.MA), "bb_up": ser(bb.BB_Up), "bb_down": ser(bb.BB_Down),
  "tenkan": ser(ich.tenkan_sen), "kijun": ser(ich.kijun_sen),
  "senkou_a": ser(ich.senkou_span_a), "senkou_b": ser(ich.senkou_span_b), "chikou": ser(ich.chikou_span),
  "cz": ser(cz),
  "vol_annual": float(r.std() * math.sqrt(252)),
  "corr_other": float(pd.Series(close).pct_change().corr(pd.Series(other).pct_change())),
}
json.dump(out, open(sys.argv[1], "w"))
print("zones:", sorted(set(int(x) for x in cz.dropna())))
