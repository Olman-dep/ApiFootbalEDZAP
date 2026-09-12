import math
import numpy as np
from typing import Dict, Any


class PoissonModel:
    @staticmethod
    def calculate_lambda(attack_stat: float, defense_stat: float, home_factor: float = 1.15) -> float:
        """Calcula el lambda base para un equipo."""
        return round(((attack_stat + defense_stat) / 2.0) * home_factor, 2)

    @staticmethod
    def pmf(k: int, lambda_param: float) -> float:
        """Función de masa de probabilidad P(X = k)."""
        if lambda_param <= 0 or k < 0:
            return 0.0
        return (math.pow(lambda_param, k) * math.exp(-lambda_param)) / math.factorial(k)

    @classmethod
    def calculate_over_under(cls, lambda_param: float, line: float) -> float:
        """Calcula probabilidad acumulada Over X.5."""
        k_max = int(math.floor(line))
        prob_under = sum(cls.pmf(k, lambda_param) for k in range(k_max + 1))
        return round(1.0 - prob_under, 4)