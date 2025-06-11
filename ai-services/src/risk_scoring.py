"""
Risk Scoring Module

Calculates transaction and address risk scores based on various factors
including historical behavior, network analysis, and pattern recognition.
"""

import asyncio
import logging
import numpy as np
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from collections import defaultdict
import math

logger = logging.getLogger(__name__)

class RiskScorer:
    def __init__(self):
        self.model = None
        self.model_version = "1.0.0"
        self.last_update = datetime.now()
        self.is_model_loaded = True
        
        # Risk scoring weights
        self.weights = {
            "amount_risk": 0.25,
            "frequency_risk": 0.20,
            "address_risk": 0.20,
            "temporal_risk": 0.15,
            "network_risk": 0.20
        }
        
        logger.info("Risk scorer initialized")
    
    def is_ready(self) -> bool:
        """Check if the risk scorer is ready"""
        return self.is_model_loaded
    
    def get_model_version(self) -> str:
        """Get current model version"""
        return self.model_version
    
    def get_last_update_time(self) -> str:
        """Get last model update time"""
        return self.last_update.isoformat()
    
    async def calculate_risk_score(
        self,
        transaction: Dict[str, Any],
        address_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculate comprehensive risk score for a transaction
        
        Args:
            transaction: Current transaction data
            address_history: Historical transactions for involved addresses
            
        Returns:
            Risk analysis with score, level, and contributing factors
        """
        try:
            # Calculate individual risk components
            amount_risk = self._calculate_amount_risk(transaction, address_history)
            frequency_risk = self._calculate_frequency_risk(transaction, address_history)
            address_risk = self._calculate_address_risk(transaction, address_history)
            temporal_risk = self._calculate_temporal_risk(transaction)
            network_risk = self._calculate_network_risk(transaction, address_history)
            
            # Calculate weighted overall risk score
            overall_risk = (
                self.weights["amount_risk"] * amount_risk +
                self.weights["frequency_risk"] * frequency_risk +
                self.weights["address_risk"] * address_risk +
                self.weights["temporal_risk"] * temporal_risk +
                self.weights["network_risk"] * network_risk
            )
            
            # Ensure score is between 0 and 1
            overall_risk = max(0.0, min(1.0, overall_risk))
            
            # Determine risk level
            risk_level = self._determine_risk_level(overall_risk)
            
            # Identify contributing factors
            factors = self._identify_risk_factors(
                transaction, 
                amount_risk, 
                frequency_risk, 
                address_risk, 
                temporal_risk, 
                network_risk
            )
            
            result = {
                "score": float(overall_risk),
                "level": risk_level,
                "factors": factors,
                "components": {
                    "amount_risk": float(amount_risk),
                    "frequency_risk": float(frequency_risk),
                    "address_risk": float(address_risk),
                    "temporal_risk": float(temporal_risk),
                    "network_risk": float(network_risk)
                },
                "analysis_timestamp": datetime.now().isoformat()
            }
            
            logger.info(f"Risk score calculated: {overall_risk:.3f} ({risk_level})")
            return result
            
        except Exception as e:
            logger.error(f"Risk score calculation failed: {e}")
            return {
                "score": 0.5,
                "level": "medium",
                "factors": ["calculation_error"],
                "error": str(e)
            }
    
    def _calculate_amount_risk(
        self, 
        transaction: Dict, 
        address_history: List[Dict]
    ) -> float:
        """Calculate risk based on transaction amount patterns"""
        amount = float(transaction.get("amount", 0))
        
        if not address_history:
            # No history - assess based on absolute amount
            if amount > 1000000:  # Very large transaction
                return 0.8
            elif amount > 100000:  # Large transaction
                return 0.6
            elif amount > 10000:  # Medium transaction
                return 0.3
            else:
                return 0.1
        
        # Calculate statistics from history
        historical_amounts = [float(tx.get("amount", 0)) for tx in address_history]
        
        if not historical_amounts:
            return 0.5
        
        mean_amount = np.mean(historical_amounts)
        std_amount = np.std(historical_amounts)
        
        # Z-score based risk (how many standard deviations from mean)
        if std_amount > 0:
            z_score = abs(amount - mean_amount) / std_amount
            # Convert z-score to risk (cap at 3 standard deviations)
            amount_risk = min(1.0, z_score / 3.0)
        else:
            # All historical amounts are the same
            amount_risk = 0.0 if amount == mean_amount else 0.8
        
        return amount_risk
    
    def _calculate_frequency_risk(
        self, 
        transaction: Dict, 
        address_history: List[Dict]
    ) -> float:
        """Calculate risk based on transaction frequency patterns"""
        if not address_history:
            return 0.0
        
        current_timestamp = transaction.get("timestamp", 0)
        from_address = transaction.get("from_address", "")
        
        # Count transactions in different time windows
        time_windows = {
            "last_hour": 3600,
            "last_day": 86400,
            "last_week": 604800
        }
        
        frequency_scores = []
        
        for window_name, window_seconds in time_windows.items():
            cutoff_time = current_timestamp - window_seconds
            
            # Count transactions from the same address in this window
            recent_txs = [
                tx for tx in address_history
                if (tx.get("from_address") == from_address and
                    tx.get("timestamp", 0) > cutoff_time)
            ]
            
            tx_count = len(recent_txs)
            
            # Define risk thresholds for each window
            if window_name == "last_hour":
                risk = min(1.0, tx_count / 10.0)  # 10+ txs in hour = high risk
            elif window_name == "last_day":
                risk = min(1.0, tx_count / 100.0)  # 100+ txs in day = high risk
            else:  # last_week
                risk = min(1.0, tx_count / 500.0)  # 500+ txs in week = high risk
            
            frequency_scores.append(risk)
        
        # Return maximum risk across time windows
        return max(frequency_scores)
    
    def _calculate_address_risk(
        self, 
        transaction: Dict, 
        address_history: List[Dict]
    ) -> float:
        """Calculate risk based on address characteristics and history"""
        from_address = transaction.get("from_address", "")
        to_address = transaction.get("to_address", "")
        
        risk_factors = []
        
        # Address format analysis
        if len(from_address) < 10 or len(to_address) < 10:
            risk_factors.append(0.5)  # Suspiciously short addresses
        
        if from_address == to_address:
            risk_factors.append(0.9)  # Self-transaction
        
        # Address reputation (simplified)
        # In a real system, this would check against known bad actors
        known_bad_patterns = ["000000", "111111", "aaaaaa"]
        
        for pattern in known_bad_patterns:
            if pattern in from_address.lower() or pattern in to_address.lower():
                risk_factors.append(0.7)
                break
        
        # Address age and activity (if history available)
        if address_history:
            from_txs = [tx for tx in address_history if tx.get("from_address") == from_address]
            to_txs = [tx for tx in address_history if tx.get("to_address") == to_address]
            
            # New addresses with high activity are suspicious
            if len(from_txs) < 5 and len(to_txs) > 20:
                risk_factors.append(0.6)
        
        # Return maximum risk factor or 0 if none found
        return max(risk_factors) if risk_factors else 0.0
    
    def _calculate_temporal_risk(self, transaction: Dict) -> float:
        """Calculate risk based on timing patterns"""
        timestamp = transaction.get("timestamp", 0)
        
        # Convert to datetime for analysis
        dt = datetime.fromtimestamp(timestamp)
        hour = dt.hour
        day_of_week = dt.weekday()  # 0 = Monday, 6 = Sunday
        
        risk_factors = []
        
        # Time of day risk
        if 2 <= hour <= 5:  # Late night/early morning
            risk_factors.append(0.7)
        elif 22 <= hour <= 23 or 0 <= hour <= 1:  # Night time
            risk_factors.append(0.4)
        
        # Weekend risk (slightly higher for financial transactions)
        if day_of_week >= 5:  # Saturday or Sunday
            risk_factors.append(0.3)
        
        # Holiday risk would go here (requires holiday calendar)
        
        return max(risk_factors) if risk_factors else 0.0
    
    def _calculate_network_risk(
        self, 
        transaction: Dict, 
        address_history: List[Dict]
    ) -> float:
        """Calculate risk based on network connectivity and patterns"""
        if not address_history:
            return 0.0
        
        from_address = transaction.get("from_address", "")
        to_address = transaction.get("to_address", "")
        
        # Build address interaction graph
        connections = defaultdict(set)
        
        for tx in address_history:
            tx_from = tx.get("from_address", "")
            tx_to = tx.get("to_address", "")
            if tx_from and tx_to:
                connections[tx_from].add(tx_to)
                connections[tx_to].add(tx_from)
        
        risk_factors = []
        
        # Check for potential mixing/tumbling patterns
        from_connections = len(connections.get(from_address, set()))
        to_connections = len(connections.get(to_address, set()))
        
        # Addresses with many connections might be mixers
        if from_connections > 50:
            risk_factors.append(0.8)
        elif from_connections > 20:
            risk_factors.append(0.5)
        
        if to_connections > 50:
            risk_factors.append(0.8)
        elif to_connections > 20:
            risk_factors.append(0.5)
        
        # Check for circular transaction patterns
        circular_risk = self._detect_circular_patterns(
            from_address, to_address, connections, max_depth=3
        )
        risk_factors.append(circular_risk)
        
        return max(risk_factors) if risk_factors else 0.0
    
    def _detect_circular_patterns(
        self, 
        start_addr: str, 
        target_addr: str, 
        connections: Dict, 
        max_depth: int = 3
    ) -> float:
        """Detect circular transaction patterns that might indicate laundering"""
        
        def dfs_circular(current: str, target: str, visited: set, depth: int) -> bool:
            if depth >= max_depth:
                return False
            
            if current == target and depth > 0:
                return True
            
            if current in visited:
                return False
            
            visited.add(current)
            
            for neighbor in connections.get(current, set()):
                if dfs_circular(neighbor, target, visited.copy(), depth + 1):
                    return True
            
            return False
        
        # Check if there's a path from target back to start
        has_circular = dfs_circular(target_addr, start_addr, set(), 0)
        
        return 0.8 if has_circular else 0.0
    
    def _determine_risk_level(self, score: float) -> str:
        """Convert numerical risk score to categorical level"""
        if score >= 0.8:
            return "high"
        elif score >= 0.5:
            return "medium"
        else:
            return "low"
    
    def _identify_risk_factors(
        self,
        transaction: Dict,
        amount_risk: float,
        frequency_risk: float,
        address_risk: float,
        temporal_risk: float,
        network_risk: float
    ) -> List[str]:
        """Identify specific risk factors for transparency"""
        factors = []
        
        if amount_risk > 0.6:
            factors.append("unusual_transaction_amount")
        
        if frequency_risk > 0.6:
            factors.append("high_transaction_frequency")
        
        if address_risk > 0.6:
            factors.append("suspicious_address_patterns")
        
        if temporal_risk > 0.4:
            factors.append("unusual_timing")
        
        if network_risk > 0.6:
            factors.append("complex_network_patterns")
        
        return factors if factors else ["no_significant_risk_factors"]
