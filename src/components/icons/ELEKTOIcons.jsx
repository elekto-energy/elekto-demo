// src/components/icons/ELEKTOIcons.jsx
import React from "react";

/**
 * ELEKTO Icons
 * -------------------------------------------------------
 * <ELEKTOIcon type="battery" size={28} strokeWidth={2} color="currentColor" />
 * Typer:
 *  - inverter
 *  - smartMeter
 *  - battery
 *  - evCharger
 *  - evCarSoc
 *  - heatPump
 *  - hotWater
 *  - smartPlug
 *  - energyMeasurement
 *  - temperature
 *  - homeAppliance
 */

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const paths = {
  inverter: (p) => (
    <g {...p}>
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <rect x="8" y="9" width="8" height="6" rx="1.5" />
      <line x1="6" y1="6.5" x2="6" y2="6.5" />
      <line x1="18" y1="6.5" x2="18" y2="6.5" />
      <line x1="6" y1="17.5" x2="6" y2="17.5" />
      <line x1="18" y1="17.5" x2="18" y2="17.5" />
    </g>
  ),

  smartMeter: (p) => (
    <g {...p}>
      <circle cx="12" cy="12" r="9" />
      <rect x="7.5" y="11" width="9" height="3" rx="1" />
      <circle cx="6.5" cy="8" r="0.9" />
      <circle cx="9" cy="8" r="0.9" />
      <circle cx="12" cy="8" r="0.9" />
      <circle cx="14.9" cy="8" r="0.9" />
      <circle cx="17.3" cy="8" r="0.9" />
    </g>
  ),

  battery: (p) => (
    <g {...p}>
      <rect x="3" y="6" width="16" height="12" rx="2" />
      <rect x="20" y="10" width="1.5" height="4" rx="0.75" />
      <path d="M10 8 L7.5 13 H11 L8.5 18" />
    </g>
  ),

  evCharger: (p) => (
    <g {...p}>
      <rect x="6" y="3" width="8" height="18" rx="2" />
      <rect x="7.5" y="5" width="5" height="4" rx="0.8" />
      <path d="M9.5 11 L8 14 h3 l-1.5 3" />
      <path d="M14 8.5 c3 0 4.5 1.5 4.5 4.5v1.5c0 .8 .7 1.5 1.5 1.5h0.5" />
      <circle cx="20.5" cy="16" r="0.7" />
    </g>
  ),

  evCarSoc: (p) => (
    <g {...p}>
      <path d="M5 16 v-2.2 c0-1.2 .8-2.2 2-2.5 l7.8-1.7 c1.2-.3 2.4 .5 2.7 1.8L18.3 14" />
      <path d="M4 16 h15.5 c.8 0 1.5 .7 1.5 1.5v.5" />
      <circle cx="7" cy="18" r="1" />
      <circle cx="17" cy="18" r="1" />
      {/* plug over car */}
      <path d="M10.5 6.5 h3 v2 h-3 z" />
      <path d="M12 4.5 v2" />
      <path d="M13.5 4.5 v2" />
    </g>
  ),

  heatPump: (p) => (
    <g {...p}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 8.5 v3.5 l2.5 2.5" />
      <line x1="6" y1="9" x2="6" y2="15" />
      <line x1="18" y1="9" x2="18" y2="15" />
      <line x1="6" y1="17.5" x2="18" y2="17.5" />
    </g>
  ),

  hotWater: (p) => (
    <g {...p}>
      <path d="M6 7 v5 a4 4 0 0 0 8 0 V7" />
      <path d="M10 7 c0-1.2 .8-2.2 2-2.2 s2 .9 2 2.2 v5" />
      <path d="M4 14 c1 .8 2.4 1.2 4 1.2 s3-.4 4-1.2" />
      {/* thermometer + droplet motif */}
      <path d="M16.5 6 v6" />
      <circle cx="16.5" cy="13" r="1.2" />
      <path d="M18.8 12.2 c1 .9 1 2.3 0 3.2 a2.2 2.2 0 0 1-3.2 0" />
    </g>
  ),

  smartPlug: (p) => (
    <g {...p}>
      <rect x="5" y="4" width="14" height="16" rx="3" />
      <rect x="7.5" y="6.5" width="9" height="11" rx="2" />
      <circle cx="11" cy="12" r="0.8" />
      <circle cx="15" cy="12" r="0.8" />
    </g>
  ),

  energyMeasurement: (p) => (
    <g {...p}>
      <rect x="3" y="3" width="18" height="14" rx="2" />
      <path d="M7 9 h10" />
      <path d="M9.5 6 v2.5" />
      <path d="M14.5 6 v2.5" />
      <path d="M10.5 12 L9 14.5 h2.3 L9.8 17" />
    </g>
  ),

  temperature: (p) => (
    <g {...p}>
      <path d="M10 5 v8 a3 3 0 1 0 4 0 V5 a2 2 0 0 0-4 0z" />
      <line x1="10" y1="10" x2="14" y2="10" />
      <line x1="10" y1="7.5" x2="12" y2="7.5" />
      <line x1="10" y1="12.5" x2="12.5" y2="12.5" />
      <path d="M16.5 9.5 h2.5" />
      <path d="M16.5 12.5 h2.5" />
    </g>
  ),

  homeAppliance: (p) => (
    <g {...p}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <rect x="8" y="6" width="8" height="3" rx="0.6" />
      <circle cx="12" cy="14" r="4" />
      <circle cx="12" cy="14" r="2" />
      <circle cx="9" cy="7.5" r="0.6" />
      <circle cx="10.8" cy="7.5" r="0.6" />
      <circle cx="12.6" cy="7.5" r="0.6" />
    </g>
  ),
};

export function ELEKTOIcon({
  type,
  size = 24,
  strokeWidth = 1.8,
  color = "currentColor",
  className = "",
  style,
  ...rest
}) {
  const Path = paths[type];
  if (!Path) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[ELEKTOIcon] Unknown type "${type}".`);
    }
    return null;
  }

  return (
    <svg
      width={size}
      height={size}
      {...base}
      stroke={color}
      strokeWidth={strokeWidth}
      className={className}
      style={style}
      {...rest}
    >
      {Path({})}
    </svg>
  );
}

// Named exports for convenience
export const InverterIcon = (props) => <ELEKTOIcon type="inverter" {...props} />;
export const SmartMeterIcon = (props) => <ELEKTOIcon type="smartMeter" {...props} />;
export const BatteryIcon = (props) => <ELEKTOIcon type="battery" {...props} />;
export const EVChargerIcon = (props) => <ELEKTOIcon type="evCharger" {...props} />;
export const EVCarSocIcon = (props) => <ELEKTOIcon type="evCarSoc" {...props} />;
export const HeatPumpIcon = (props) => <ELEKTOIcon type="heatPump" {...props} />;
export const HotWaterIcon = (props) => <ELEKTOIcon type="hotWater" {...props} />;
export const SmartPlugIcon = (props) => <ELEKTOIcon type="smartPlug" {...props} />;
export const EnergyMeasurementIcon = (props) => <ELEKTOIcon type="energyMeasurement" {...props} />;
export const TemperatureIcon = (props) => <ELEKTOIcon type="temperature" {...props} />;
export const HomeApplianceIcon = (props) => <ELEKTOIcon type="homeAppliance" {...props} />;
