from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import SessionLocal
from models import Equipment, EquipmentReservation, RoomReservation, EquipmentReturn
from datetime import datetime, timedelta
from collections import defaultdict, Counter
import json

router = APIRouter(prefix="/analytics", tags=["analytics"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/peak-usage")
def get_peak_usage(db: Session = Depends(get_db)):
    """
    Analyze peak usage periods based on historical reservations.
    Returns peak days, times, and equipment demand insights.
    """
    # Query both equipment and room reservations
    equipment_reservations = db.query(EquipmentReservation).all()
    room_reservations = db.query(RoomReservation).all()
    
    all_reservations = equipment_reservations + room_reservations
    
    if not all_reservations:
        return {
            "peak_days": [],
            "peak_times": [],
            "equipment_demand": [],
            "busiest_weekday": None,
            "message": "No reservation data available"
        }
    
    # Analyze peak days (weekday 0=Mon, 6=Sun)
    day_counts = defaultdict(int)
    day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    
    # Analyze peak times (hour of day)
    time_counts = defaultdict(int)
    
    # Analyze equipment demand (which items are reserved most)
    equipment_demand = defaultdict(int)
    
    for res in all_reservations:
        if res.date_needed:
            try:
                res_date = datetime.strptime(str(res.date_needed), '%Y-%m-%d').date() if isinstance(res.date_needed, str) else res.date_needed
                day_of_week = res_date.weekday()  # 0=Monday, 6=Sunday
                day_counts[day_names[day_of_week]] += 1
            except:
                pass
        
        # Analyze time slots
        if res.time_from:
            try:
                hour = int(str(res.time_from).split(':')[0])
                minute = str(res.time_from).split(':')[1] if ':' in str(res.time_from) else '00'
                # For room reservations with end time, show range. For equipment (no end time), show just start
                if isinstance(res, RoomReservation) and res.time_to:
                    end_hour = int(str(res.time_to).split(':')[0])
                    end_minute = str(res.time_to).split(':')[1] if ':' in str(res.time_to) else '00'
                    time_counts[f"{hour}:{minute} - {end_hour}:{end_minute}"] += 1
                else:
                    # Equipment reservation or no end time
                    time_counts[f"{hour}:{minute}"] += 1
            except:
                pass
        
        # Analyze equipment demand (only for EquipmentReservation)
        if isinstance(res, EquipmentReservation) and res.item_name:
            equipment_demand[res.item_name] += 1
    
    # Get top 3 peak days
    peak_days = sorted(day_counts.items(), key=lambda x: x[1], reverse=True)[:3]
    
    # Get top 5 peak times
    peak_times = sorted(time_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    
    # Get top equipment by demand
    top_equipment = sorted(equipment_demand.items(), key=lambda x: x[1], reverse=True)[:5]
    
    # Calculate busiest weekday
    weekday_counts = defaultdict(int)
    for day_name, count in day_counts.items():
        if day_name != 'Saturday' and day_name != 'Sunday':
            weekday_counts[day_name] = count
    
    busiest_weekday = max(weekday_counts, key=weekday_counts.get) if weekday_counts else None
    
    return {
        "peak_days": [{"day": day, "reservations": count} for day, count in peak_days],
        "peak_times": [{"time": time, "reservations": count} for time, count in peak_times],
        "equipment_demand": [{"equipment": eq, "demand": count} for eq, count in top_equipment],
        "busiest_weekday": busiest_weekday,
        "total_reservations": len(all_reservations),
        "analysis_date": datetime.now().isoformat()
    }

@router.get("/demand-forecast")
def get_demand_forecast(db: Session = Depends(get_db)):
    """
    Generate demand forecast for next 7 days based on historical patterns.
    Uses trend analysis and historical data to predict future demand.
    """
    # Query both equipment and room reservations
    equipment_reservations = db.query(EquipmentReservation).all()
    room_reservations = db.query(RoomReservation).all()
    
    all_reservations = equipment_reservations + room_reservations
    
    if not all_reservations:
        return {
            "forecast": [],
            "message": "Insufficient data for forecast"
        }
    
    # Get today's date and next 7 days
    today = datetime.now().date()
    forecast_days = []
    day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    
    # Calculate average reservations per day of week from history
    day_of_week_avg = defaultdict(list)
    
    for res in all_reservations:
        if res.date_needed:
            try:
                res_date = datetime.strptime(str(res.date_needed), '%Y-%m-%d').date() if isinstance(res.date_needed, str) else res.date_needed
                day_of_week = res_date.weekday()
                day_of_week_avg[day_of_week].append(res)
            except:
                pass
    
    # Generate 7-day forecast
    for i in range(7):
        forecast_date = today + timedelta(days=i)
        day_of_week = forecast_date.weekday()
        day_name = day_names[day_of_week]
        
        # Get historical data for this day of week
        historical_count = len(day_of_week_avg.get(day_of_week, []))
        
        # Simple forecast: use historical average for this day + small trend
        predicted_demand = max(0, historical_count)
        confidence = 'High' if historical_count >= 2 else 'Medium' if historical_count >= 1 else 'Low'
        
        forecast_days.append({
            "date": forecast_date.isoformat(),
            "day_name": day_name,
            "predicted_demand": predicted_demand,
            "confidence": confidence,
            "status": "Expected" if predicted_demand > 1 else "Light"
        })
    
    return {
        "forecast": forecast_days,
        "forecast_period": f"{today.isoformat()} to {(today + timedelta(days=6)).isoformat()}",
        "analysis_date": datetime.now().isoformat()
    }


@router.get("/equipment-health")
def get_equipment_health(db: Session = Depends(get_db)):
    """
    Analyze equipment health based on return conditions.
    Shows which equipment is damaged/needs maintenance frequently.
    """
    returns = db.query(EquipmentReturn).all()
    equipment_list = db.query(Equipment).all()
    
    if not returns:
        return {
            "equipment_health": [],
            "total_returns": 0,
            "damage_rate": 0,
            "message": "No equipment return data available"
        }
    
    # Count returns by equipment and condition
    equipment_conditions = defaultdict(lambda: {"good": 0, "damaged": 0, "maintenance": 0, "total": 0})
    
    for ret in returns:
        if ret.equipment_name:
            equipment_conditions[ret.equipment_name]["total"] += 1
            if ret.condition == "good":
                equipment_conditions[ret.equipment_name]["good"] += 1
            elif ret.condition == "damaged":
                equipment_conditions[ret.equipment_name]["damaged"] += 1
            elif ret.condition == "maintenance":
                equipment_conditions[ret.equipment_name]["maintenance"] += 1
    
    # Calculate health scores for each equipment
    equipment_health = []
    total_damaged = 0
    
    for eq_name, conditions in equipment_conditions.items():
        total = conditions["total"]
        damaged_count = conditions["damaged"] + conditions["maintenance"]
        damage_rate = (damaged_count / total * 100) if total > 0 else 0
        
        health_score = 100 - damage_rate
        health_status = "Excellent" if health_score >= 90 else "Good" if health_score >= 70 else "Fair" if health_score >= 50 else "Poor"
        
        equipment_health.append({
            "equipment": eq_name,
            "total_returns": total,
            "good_condition": conditions["good"],
            "damaged": conditions["damaged"],
            "maintenance_needed": conditions["maintenance"],
            "damage_rate": round(damage_rate, 2),
            "health_score": round(health_score, 2),
            "status": health_status
        })
        
        total_damaged += conditions["damaged"]
    
    # Sort by damage rate descending (most problematic first)
    equipment_health.sort(key=lambda x: x["damage_rate"], reverse=True)
    
    # Calculate overall damage rate
    overall_total_returns = len(returns)
    overall_damage_rate = (total_damaged / overall_total_returns * 100) if overall_total_returns > 0 else 0
    
    return {
        "equipment_health": equipment_health[:10],  # Top 10 most problematic
        "total_returns": overall_total_returns,
        "total_damaged_items": total_damaged,
        "overall_damage_rate": round(overall_damage_rate, 2),
        "at_risk_equipment": [eq for eq in equipment_health if eq["health_score"] < 70],
        "analysis_date": datetime.now().isoformat()
    }

@router.get("/recommendations")
def get_recommendations(db: Session = Depends(get_db)):
    """
    Provide actionable recommendations based on usage patterns AND equipment health.
    """
    peak_data = get_peak_usage(db)
    forecast_data = get_demand_forecast(db)
    health_data = get_equipment_health(db)
    
    recommendations = []
    
    # Recommendation 1: Peak time management
    if peak_data.get("peak_times"):
        peak_time = peak_data["peak_times"][0]["time"]
        recommendations.append({
            "title": "🕐 Peak Time Management",
            "description": f"Highest activity during {peak_time}. Schedule maintenance outside these hours.",
            "priority": "High",
            "action": "Review staffing during peak hours",
            "type": "scheduling"
        })
    
    # Recommendation 2: Equipment maintenance from health data
    if health_data.get("at_risk_equipment"):
        risk_count = len(health_data["at_risk_equipment"])
        recommendations.append({
            "title": "⚠️ Equipment Maintenance Alert",
            "description": f"{risk_count} equipment item(s) showing poor condition. Immediate maintenance recommended.",
            "priority": "High",
            "action": f"Check: {', '.join([eq['equipment'] for eq in health_data['at_risk_equipment'][:3]])}",
            "type": "maintenance"
        })
    
    # Recommendation 3: High-demand equipment
    if peak_data.get("equipment_demand"):
        top_equipment = peak_data["equipment_demand"][0]["equipment"]
        top_demand = peak_data["equipment_demand"][0]["demand"]
        recommendations.append({
            "title": "📊 High-Demand Equipment",
            "description": f"{top_equipment} reserved {top_demand} times. Ensure sufficient stock and inventory.",
            "priority": "High",
            "action": "Check availability and stock levels",
            "type": "inventory"
        })
    
    # Recommendation 4: Busiest day
    if peak_data.get("busiest_weekday"):
        busiest = peak_data["busiest_weekday"]
        recommendations.append({
            "title": "📅 Peak Weekday Pattern",
            "description": f"{busiest} has highest demand. Allocate resources accordingly.",
            "priority": "Medium",
            "action": "Plan staffing for this day",
            "type": "scheduling"
        })
    
    # Recommendation 5: Overall equipment health
    if health_data.get("overall_damage_rate"):
        damage_rate = health_data["overall_damage_rate"]
        if damage_rate > 20:
            recommendations.append({
                "title": "🔧 Overall Equipment Health",
                "description": f"{damage_rate}% of returned items have damage/maintenance needs. Review handling procedures.",
                "priority": "High",
                "action": "Conduct training or improve handling guidelines",
                "type": "quality"
            })
    
    # Recommendation 6: Upcoming forecast
    high_demand_days = [f for f in forecast_data.get("forecast", []) if f["status"] == "Expected"]
    if high_demand_days:
        recommendations.append({
            "title": "📈 Forecast: High Demand Ahead",
            "description": f"High demand predicted on {len(high_demand_days)} day(s) next week.",
            "priority": "Medium",
            "action": "Prepare inventory and increase availability",
            "type": "planning"
        })
    
    return {
        "recommendations": recommendations,
        "total_insights": len(recommendations),
        "generated_at": datetime.now().isoformat()
    }
