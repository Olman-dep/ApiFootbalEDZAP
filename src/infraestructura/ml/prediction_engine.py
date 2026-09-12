from typing import Dict, Any
from .poisson_model import PoissonModel
from .monte_carlo import MonteCarloEngine


class PredictionEngine:
    def __init__(self, simulations: int = 20000):
        self.poisson = PoissonModel()
        self.monte_carlo = MonteCarloEngine(simulations=simulations)

    def calculate_ev(self, probability: float, odds: float) -> Dict[str, Any]:
        """Calcula probabilidad implícita y EV."""
        if odds <= 1.0 or probability <= 0:
            return {"implied_probability": 0.0, "expected_value": 0.0, "is_value_bet": False}

        implied_prob = round(1.0 / odds, 4)
        ev = round((probability * odds) - 1.0, 4)

        return {
            "implied_probability": implied_prob,
            "expected_value": ev,
            "is_value_bet": ev > 0.0
        }

    def generate_full_prediction(
        self, match_id: str, home_attack: float, away_defense: float, odds_over_2_5: float
    ) -> Dict[str, Any]:
        """Orquesta Poisson + Monte Carlo + EV."""
        lambda_home = self.poisson.calculate_lambda(home_attack, away_defense, home_factor=1.15)
        lambda_away = self.poisson.calculate_lambda(away_defense, home_attack, home_factor=1.0)

        sim_results = self.monte_carlo.run_simulation(lambda_home, lambda_away)
        ev_data = self.calculate_ev(sim_results["prob_over_2_5"], odds_over_2_5)

        return {
            "match_id": match_id,
            "simulations_run": self.monte_carlo.simulations,
            "lambdas": {
                "home_goals": lambda_home,
                "away_goals": lambda_away
            },
            "markets": [
                {
                    "market": "goals",
                    "selection": "over_2.5",
                    "probability": sim_results["prob_over_2_5"],
                    "confidence": 0.75,
                    "odds": odds_over_2_5,
                    "implied_probability": ev_data["implied_probability"],
                    "expected_value": ev_data["expected_value"],
                    "is_value_bet": ev_data["is_value_bet"]
                }
            ],
            "model": {"name": "poisson_monte_carlo", "version": "1.0.0"}
        }