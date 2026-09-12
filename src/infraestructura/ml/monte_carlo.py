import numpy as np
from typing import Dict, Any


class MonteCarloEngine:
    def __init__(self, simulations: int = 20000, seed: int = 42):
        self.simulations = simulations
        self.seed = seed
        np.random.seed(self.seed)

    def run_simulation(self, lambda_home: float, lambda_away: float) -> Dict[str, float]:
        """Simula N partidos virtuales muestreando goles/eventos."""
        home_goals = np.random.poisson(lambda_home, self.simulations)
        away_goals = np.random.poisson(lambda_away, self.simulations)

        # Cálculo de frecuencias
        home_wins = np.sum(home_goals > away_goals)
        draws = np.sum(home_goals == away_goals)
        away_wins = np.sum(home_goals < away_goals)

        total_goals = home_goals + away_goals
        prob_over_2_5 = np.sum(total_goals > 2.5) / self.simulations

        return {
            "prob_1": round(float(home_wins / self.simulations), 4),
            "prob_x": round(float(draws / self.simulations), 4),
            "prob_2": round(float(away_wins / self.simulations), 4),
            "prob_over_2_5": round(float(prob_over_2_5), 4),
        }