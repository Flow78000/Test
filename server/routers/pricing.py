"""
FLO.W - Pricing Lab router

Exposes the multi-asset pricing engine (vanilla options, digitals,
barriers, swaps, FX forwards, autocallables) as clean POST endpoints.
"""
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from services import pricing_engine

router = APIRouter()


class VanillaRequest(BaseModel):
    spot: float
    strike: float
    t: float                # years to expiry
    r: float = 0.045
    q: float = 0.015
    sigma: float = 0.20
    option_type: str = "call"
    model: str = "black-scholes"  # or "black-76"


@router.post("/vanilla")
def price_vanilla(req: VanillaRequest):
    if req.model == "black-76":
        result = pricing_engine.black_76(req.spot, req.strike, req.t, req.r, req.sigma, req.option_type)
    else:
        result = pricing_engine.black_scholes(req.spot, req.strike, req.t, req.r, req.q, req.sigma, req.option_type)
    return {"ok": True, **result}


class ImpliedVolRequest(BaseModel):
    price: float
    spot: float
    strike: float
    t: float
    r: float = 0.045
    q: float = 0.015
    option_type: str = "call"


@router.post("/implied-vol")
def price_iv(req: ImpliedVolRequest):
    iv = pricing_engine.implied_vol(req.price, req.spot, req.strike, req.t, req.r, req.q, req.option_type)
    return {"ok": iv is not None, "implied_vol": iv}


class DigitalRequest(BaseModel):
    spot: float
    strike: float
    t: float
    r: float = 0.045
    q: float = 0.015
    sigma: float = 0.20
    option_type: str = "call"
    cash: float = 1.0


@router.post("/digital")
def price_digital(req: DigitalRequest):
    return {"ok": True, **pricing_engine.digital_option(
        req.spot, req.strike, req.t, req.r, req.q, req.sigma, req.option_type, req.cash
    )}


class BarrierRequest(BaseModel):
    spot: float
    strike: float
    barrier: float
    t: float
    r: float = 0.045
    q: float = 0.015
    sigma: float = 0.20
    option_type: str = "call"
    barrier_type: str = "up-and-out"
    rebate: float = 0.0


@router.post("/barrier")
def price_barrier(req: BarrierRequest):
    return {"ok": True, **pricing_engine.barrier_option(
        req.spot, req.strike, req.barrier, req.t, req.r, req.q,
        req.sigma, req.option_type, req.barrier_type, req.rebate,
    )}


class SwapRequest(BaseModel):
    notional: float = 10_000_000.0
    fixed_rate: float = 0.042
    float_rate: float = 0.045
    tenor_years: float = 5.0
    freq: int = 2
    disc_rate: Optional[float] = None
    pay_fixed: bool = True


@router.post("/swap")
def price_swap(req: SwapRequest):
    return {"ok": True, **pricing_engine.swap_pv(
        req.notional, req.fixed_rate, req.float_rate, req.tenor_years,
        req.freq, req.disc_rate, req.pay_fixed,
    )}


class FxForwardRequest(BaseModel):
    spot: float
    rate_base: float = 0.045      # e.g. USD rate for EURUSD
    rate_quote: float = 0.025     # e.g. EUR rate for EURUSD
    tenor_days: int = 90
    notional: float = 1_000_000.0


@router.post("/fx-forward")
def price_fx_forward(req: FxForwardRequest):
    return {"ok": True, **pricing_engine.fx_forward(
        req.spot, req.rate_base, req.rate_quote, req.tenor_days, req.notional,
    )}


class AutocallRequest(BaseModel):
    spot: float
    coupon: float = 0.02                  # per observation
    barrier_protection: float = 0.70      # KI barrier as multiple of spot
    autocall_trigger: float = 1.00        # autocall barrier as multiple of spot
    observations: int = 4                 # number of observation dates
    notional: float = 1_000_000.0
    r: float = 0.045
    q: float = 0.015
    sigma: float = 0.25
    tenor_years: float = 1.0
    n_paths: int = 20000
    seed: int = 42


@router.post("/autocall")
def price_autocall(req: AutocallRequest):
    return {"ok": True, **pricing_engine.autocall_mc(
        req.spot, req.coupon, req.barrier_protection, req.autocall_trigger,
        req.observations, req.notional, req.r, req.q, req.sigma,
        req.tenor_years, req.n_paths, req.seed,
    )}
