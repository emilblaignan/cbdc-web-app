import React, { useState, useEffect, useRef, useMemo } from 'react';
import Globe from 'react-globe.gl';
import Plot from 'react-plotly.js';
import './App.css';
import myAppLogo from './brb-logo.png';

// ─── Enhanced Mock Data ────────────────────────────────────────────────────────
const countryData = [
  { id:'USA', name:'United States',   lat:37.0902,  lon:-95.7129,  status:'research', gdp:21400, cbdc_type:'retail',    inflation_impact:0.4, capital_flow:2.1, interest_rate:1.5, cbdc_scale:8 },
  { id:'CHN', name:'China',            lat:35.8617,  lon:104.1954, status:'launched',  gdp:14700, cbdc_type:'retail',    inflation_impact:0.3, capital_flow:1.8, interest_rate:2.1, cbdc_scale:10 },
  { id:'EUR', name:'Eurozone',         lat:50.5039,  lon:4.4699,   status:'pilot',     gdp:13300, cbdc_type:'retail',    inflation_impact:0.2, capital_flow:1.5, interest_rate:0.5, cbdc_scale:9 },
  { id:'GBR', name:'United Kingdom',   lat:55.3781,  lon:-3.4360,  status:'research',  gdp:2700,  cbdc_type:'retail',    inflation_impact:0.3, capital_flow:1.2, interest_rate:0.75, cbdc_scale:7 },
  { id:'JPN', name:'Japan',            lat:36.2048,  lon:138.2529, status:'pilot',     gdp:5100,  cbdc_type:'retail',    inflation_impact:0.1, capital_flow:0.9, interest_rate:0.1, cbdc_scale:8 },
  { id:'SGP', name:'Singapore',        lat:1.3521,   lon:103.8198, status:'pilot',     gdp:340,   cbdc_type:'wholesale', inflation_impact:0.5, capital_flow:2.3, interest_rate:0.8, cbdc_scale:6 },
  { id:'IND', name:'India',            lat:20.5937,  lon:78.9629,  status:'pilot',     gdp:2900,  cbdc_type:'retail',    inflation_impact:0.6, capital_flow:1.4, interest_rate:3.5, cbdc_scale:7 },
  { id:'BRA', name:'Brazil',           lat:-14.2350, lon:-51.9253, status:'research',  gdp:1800,  cbdc_type:'retail',    inflation_impact:0.7, capital_flow:0.8, interest_rate:4.5, cbdc_scale:6 },
  { id:'CAN', name:'Canada',           lat:56.1304,  lon:-106.3468,status:'research',  gdp:1700,  cbdc_type:'retail',    inflation_impact:0.3, capital_flow:1.1, interest_rate:1.0, cbdc_scale:6 },
  { id:'AUS', name:'Australia',        lat:-25.2744, lon:133.7751,status:'research',  gdp:1400,  cbdc_type:'retail',    inflation_impact:0.2, capital_flow:0.9, interest_rate:0.8, cbdc_scale:5 }
];

const relationshipData = [
  { source:'USA', target:'CAN', type:'trade', weight:3, inflation_spillover:0.6, capital_flow_change:1.4 },
  { source:'USA', target:'CHN', type:'trade', weight:4, inflation_spillover:0.5, capital_flow_change:2.1 },
  { source:'USA', target:'EUR', type:'trade', weight:3, inflation_spillover:0.4, capital_flow_change:1.8 },
  { source:'CHN', target:'JPN', type:'trade', weight:3, inflation_spillover:0.5, capital_flow_change:1.2 },
  { source:'CHN', target:'SGP', type:'interoperability', weight:2, inflation_spillover:0.7, capital_flow_change:1.5 },
  { source:'EUR', target:'GBR', type:'financial', weight:2, inflation_spillover:0.6, capital_flow_change:1.3 },
  { source:'EUR', target:'CHN', type:'trade', weight:3, inflation_spillover:0.4, capital_flow_change:1.1 },
  { source:'SGP', target:'JPN', type:'interoperability', weight:2, inflation_spillover:0.8, capital_flow_change:1.6 },
  { source:'IND', target:'CHN', type:'trade', weight:2, inflation_spillover:0.3, capital_flow_change:0.9 },
  { source:'BRA', target:'USA', type:'financial', weight:2, inflation_spillover:0.5, capital_flow_change:1.2 },
  { source:'AUS', target:'CHN', type:'trade', weight:2, inflation_spillover:0.4, capital_flow_change:1.0 },
  { source:'AUS', target:'SGP', type:'financial', weight:1, inflation_spillover:0.3, capital_flow_change:0.7 }
];

// Enhanced DSGE data for all countries
const generateImpulseResponseData = () => {
  const baseData = { time: [1,2,3,4,5,6,7,8] };
  
  countryData.forEach(country => {
    const impact_factor = country.inflation_impact;
    const peak_position = Math.max(1, Math.min(7, Math.round(8 - impact_factor * 10)));
    
    const inflation_values = baseData.time.map(t => {
      const distance_from_peak = Math.abs(t - peak_position);
      return Math.max(0, impact_factor * (1 - 0.15 * distance_from_peak));
    });
    
    const gdp_values = baseData.time.map(t => {
      if (t < 4) return -0.05 - impact_factor * 0.3;
      if (t < 6) return -0.02 - impact_factor * 0.1;
      return 0.05 + impact_factor * 0.1;
    });
    
    baseData[`inflation_${country.id}`] = inflation_values;
    baseData[`gdp_${country.id}`] = gdp_values;
  });
  
  return baseData;
};

const impulseResponseData = generateImpulseResponseData();

const capitalFlowData = [
  { region:'Developed',  value:  2.3 },
  { region:'Emerging',   value: -1.2 },
  { region:'Developing', value: -1.1 }
];

const globalImpactData = [
  { metric: 'Capital Flow Shift to Developed Economies', value: 2.3 },
  { metric: 'Countries with >0.5% Inflation Spillover', value: 4 },
  { metric: 'Policy Coordination Index', value: 6.8 }
];

// Scenario + metric lists
const scenarios = [
  { label:'Baseline',               value:'baseline' },
  { label:'Global Inflation Shock', value:'inflation' },
  { label:'Major CBDC Launch',      value:'majorLaunch' },
  { label:'Common CBDC Platform',   value:'platform' }
];

const vizMetrics = [
  { label:'CBDC Status',     value:'status' },
  { label:'Inflation Impact',value:'inflation_impact' },
  { label:'Capital Flow',    value:'capital_flow' }
];

// Enhanced color helpers
const statusColors = { 
  research: '#4682B4', 
  pilot: '#1E90FF', 
  launched: '#00BFFF' 
};

function getNodeColor(c, metric) {
  if(metric === 'status') return statusColors[c.status];
  if(metric === 'inflation_impact') {
    const v = c.inflation_impact;
    if (v >= 0.5) return '#FF5722'; // Deep orange for high impact
    if (v >= 0.3) return '#FF9800'; // Orange for medium impact
    return '#4CAF50'; // Green for low impact
  }
  if(metric === 'capital_flow') {
    if (c.capital_flow > 1.5) return '#4CAF50'; // Green for high flow
    if (c.capital_flow > 1.0) return '#FFC107'; // Amber for medium flow
    return '#F44336'; // Red for low flow
  }
  return '#777';
}

function getEdgeColor(type) {
  if(type === 'trade') return ['rgba(33, 150, 243, 0.6)', 'rgba(33, 150, 243, 0.8)'];
  if(type === 'financial') return ['rgba(156, 39, 176, 0.6)', 'rgba(156, 39, 176, 0.8)'];
  if(type === 'interoperability') return ['rgba(0, 150, 136, 0.6)', 'rgba(0, 150, 136, 0.8)'];
  return ['rgba(158, 158, 158, 0.6)', 'rgba(158, 158, 158, 0.8)'];
}

// ─── Enhanced App Component ───────────────────────────────────────────────────────
export default function App() {
  // Controls
  const [scenario, setScenario] = useState('baseline');
  const [interestRate, setInterestRate] = useState(1.0);
  const [holdingLimit, setHoldingLimit] = useState(5000);
  const [crossBorder, setCrossBorder] = useState(true);
  const [networkLinks, setNetworkLinks] = useState(['trade','financial','interoperability']);
  const [timeStep, setTimeStep] = useState(4);
  const [vizMetric, setVizMetric] = useState('status');
  const [selectedCountry, setSelectedCountry] = useState('USA');
  const [runs, setRuns] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  // Compute enhanced nodes & links with animations
  const [nodes, setNodes] = useState([]);
  const [arcsData, setArcsData] = useState([]);

  // Update nodes and arcs when dependencies change
  useEffect(() => {
    const newNodes = countryData.map(c => ({
      ...c,
      color: getNodeColor(c, vizMetric),
      size: Math.sqrt(c.gdp) / 120, // Adjusted for better visual scale
      elevation: c.id === selectedCountry ? 0.08 : 0.03,
      opacity: c.id === selectedCountry ? 1.0 : 0.9
    }));
    
    const filteredLinks = relationshipData.filter(e => networkLinks.includes(e.type));
    const newArcs = filteredLinks.map((link, index) => ({
      ...link,
      color: getEdgeColor(link.type),
      strokeWidth: link.weight * 0.5
    }));
    
    setNodes(newNodes);
    setArcsData(newArcs);
  }, [vizMetric, networkLinks, runs, selectedCountry]);

  // Enhanced DSGE traces
  const dsgeTraces = useMemo(() => {
    if (!selectedCountry) return [];
    
    const inflationKey = `inflation_${selectedCountry}`;
    const gdpKey = `gdp_${selectedCountry}`;
    
    if (!impulseResponseData[inflationKey] || !impulseResponseData[gdpKey]) return [];
    
    const timeData = impulseResponseData.time.slice(0, timeStep);
    const inflationData = impulseResponseData[inflationKey].slice(0, timeStep);
    const gdpData = impulseResponseData[gdpKey].slice(0, timeStep);
    
    return [
      {
        x: timeData,
        y: inflationData,
        mode: 'lines+markers',
        name: 'Inflation Impact',
        line: { color: '#F44336', width: 3 },
        marker: { size: 8 },
        type: 'scatter'
      },
      {
        x: timeData,
        y: gdpData,
        mode: 'lines+markers',
        name: 'GDP Impact',
        line: { color: '#4CAF50', width: 3 },
        marker: { size: 8 },
        type: 'scatter'
      }
    ];
  }, [selectedCountry, timeStep]);

  // Globe configuration
  const globeEl = useRef();
  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = isAnimating;
      globeEl.current.controls().autoRotateSpeed = 0.3;
      globeEl.current.controls().enableZoom = true;
      globeEl.current.controls().enablePan = true;
    }
  }, [isAnimating]);

  const selectedCountryData = countryData.find(c => c.id === selectedCountry);

  // Handle network link changes
  const handleNetworkLinkChange = (linkType) => {
    setNetworkLinks(prev => 
      prev.includes(linkType) 
        ? prev.filter(type => type !== linkType)
        : [...prev, linkType]
    );
  };

  return (
    <div className="app-container">
      {/* Enhanced Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
        <img
            src={myAppLogo}
            alt="Company Logo"
            className="brb-logo"
          />
          <h2>CBDC Policy Coordinator</h2>
          <div className="version-badge"></div>
        </div>
        
        <div className="control-section">
          <h4>Scenario Configuration</h4>
          <div className="control-group">
            <label>Scenario</label>
            <select value={scenario} onChange={e=>setScenario(e.target.value)}>
              {scenarios.map(s=>(
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          
          <div className="control-group">
            <label>CBDC Interest Rate</label>
            <div className="slider-container">
              <input type="range" min={0} max={5} step={0.1}
                value={interestRate}
                onChange={e=>setInterestRate(+e.target.value)} />
              <span className="slider-value">{interestRate.toFixed(1)}%</span>
            </div>
          </div>
          
          <div className="control-group">
            <label>Holding Limit</label>
            <div className="slider-container">
              <input type="range" min={0} max={10000} step={100}
                value={holdingLimit}
                onChange={e=>setHoldingLimit(+e.target.value)} />
              <span className="slider-value">${holdingLimit.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="control-group checkbox-group">
            <label className="checkbox-label">
              <input type="checkbox"
                checked={crossBorder}
                onChange={e=>setCrossBorder(e.target.checked)} />
              <span className="checkmark"></span>
              Cross-Border Access
            </label>
          </div>
        </div>

        <div className="control-section">
          <h4>Visualization Settings</h4>
          <div className="control-group">
            <label>Visualization Metric</label>
            <select value={vizMetric} onChange={e=>setVizMetric(e.target.value)}>
              {vizMetrics.map(m=>(
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          
          <div className="control-group">
            <label>Network Links</label>
            <div className="checkbox-group">
              {['trade','financial','interoperability'].map(type => (
                <label key={type} className="checkbox-label">
                  <input 
                    type="checkbox"
                    checked={networkLinks.includes(type)}
                    onChange={() => handleNetworkLinkChange(type)} 
                  />
                  <span className="checkmark"></span>
                  {type.charAt(0).toUpperCase() + type.slice(1)} Links
                </label>
              ))}
            </div>
          </div>
          
          <div className="control-group">
            <label>Time Horizon</label>
            <div className="slider-container">
              <input type="range" min={1} max={8} step={1}
                value={timeStep}
                onChange={e=>setTimeStep(+e.target.value)} />
              <span className="slider-value">Q{timeStep}</span>
            </div>
          </div>
        </div>

        <div className="control-section">
          <h4>Display Options</h4>
          <div className="control-group checkbox-group">
            <label className="checkbox-label">
              <input type="checkbox"
                checked={isAnimating}
                onChange={e=>setIsAnimating(e.target.checked)} />
              <span className="checkmark"></span>
              Animate Network
            </label>
          </div>
          
          <div className="control-group">
            <label>Select Country</label>
            <select
              value={selectedCountry || ''}
              onChange={e=>setSelectedCountry(e.target.value)}>
              {countryData.map(c=>(
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <button className="simulate-button" onClick={()=>setRuns(r=>r+1)}>
          <span className="button-icon">⚡</span>
          Simulate Policy Impact
        </button>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Globe Section */}
        <div className="globe-section">
          <div className="globe-header">
            <h3>Global CBDC Network Visualization</h3>
            <div className="scenario-info">
              {scenarios.find(s => s.value === scenario)?.label} • Q{timeStep} • {selectedCountryData?.name}
            </div>
          </div>
          
          <div className="globe-container">
            <Globe
              ref={globeEl}
              globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
              backgroundColor="rgba(10, 15, 30, 0.95)"
              atmosphereColor="rgba(135, 206, 250, 0.4)"
              atmosphereAltitude={0.12}
              
              // Enhanced points (countries)
              pointsData={nodes}
              pointLat="lat"
              pointLng="lon"
              pointColor="color"
              pointAltitude="elevation"
              pointRadius={d => d.size}
              pointOpacity={d => d.opacity}
              pointResolution={8}
              
              // Enhanced arcs (connections) with smooth animations
              arcsData={arcsData}
              arcStartLat={d=>countryData.find(c=>c.id===d.source)?.lat}
              arcStartLng={d=>countryData.find(c=>c.id===d.source)?.lon}
              arcEndLat={d=>countryData.find(c=>c.id===d.target)?.lat}
              arcEndLng={d=>countryData.find(c=>c.id===d.target)?.lon}
              arcColor={d => d.color}
              arcAltitude={0.25}
              arcStroke={d => d.strokeWidth}
              arcDashLength={isAnimating ? 0.8 : 0}
              arcDashGap={isAnimating ? 0.2 : 0}
              arcDashAnimateTime={isAnimating ? 3000 : 0}
              
              // Ring animations for selected country
              ringsData={selectedCountryData ? [{
                lat: selectedCountryData.lat,
                lng: selectedCountryData.lon,
                maxR: 12,
                propagationSpeed: 1.5,
                repeatPeriod: 1200
              }] : []}
              ringColor={() => 'rgba(255, 215, 0, 0.5)'}
              ringMaxRadius={12}
              ringPropagationSpeed={1.5}
              ringRepeatPeriod={1200}
              
              // Labels for major economies
              labelsData={nodes.filter(d => d.gdp > 3000)}
              labelLat="lat"
              labelLng="lon"
              labelText="id"
              labelSize={1.2}
              labelColor={() => 'rgba(255, 255, 255, 0.9)'}
              labelResolution={2}
              labelAltitude={0.06}
            />
          </div>
          
          <div className="legend">
            <div className="legend-section">
              <h5>CBDC Status</h5>
              <div className="legend-items">
                <div className="legend-item">
                  <span className="dot" style={{background: statusColors.research}} />
                  Research
                </div>
                <div className="legend-item">
                  <span className="dot" style={{background: statusColors.pilot}} />
                  Pilot
                </div>
                <div className="legend-item">
                  <span className="dot" style={{background: statusColors.launched}} />
                  Launched
                </div>
              </div>
            </div>
            
            <div className="legend-section">
              <h5>Network Links</h5>
              <div className="legend-items">
                <div className="legend-item">
                  <span className="line trade" />
                  Trade Links
                </div>
                <div className="legend-item">
                  <span className="line financial" />
                  Financial Links
                </div>
                <div className="legend-item">
                  <span className="line interoperability" />
                  Interop Links
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Dashboard */}
        <div className="dashboard">
          {/* Country Details Panel */}
          <div className="panel country-panel">
            <div className="panel-header">
              <h3>{selectedCountryData?.name || 'Country'} Details</h3>
              <div className="country-flag">{selectedCountryData?.id}</div>
            </div>
            
            {selectedCountryData && (
              <>
                <div className="details-grid">
                  <div className="detail-card">
                    <div className="detail-label">CBDC Status</div>
                    <div className="detail-value status-badge" data-status={selectedCountryData.status}>
                      {selectedCountryData.status.charAt(0).toUpperCase() + selectedCountryData.status.slice(1)}
                    </div>
                  </div>
                  <div className="detail-card">
                    <div className="detail-label">CBDC Type</div>
                    <div className="detail-value">{selectedCountryData.cbdc_type}</div>
                  </div>
                  <div className="detail-card">
                    <div className="detail-label">GDP (Bn USD)</div>
                    <div className="detail-value">${selectedCountryData.gdp.toLocaleString()}</div>
                  </div>
                  <div className="detail-card">
                    <div className="detail-label">Interest Rate</div>
                    <div className="detail-value">{selectedCountryData.interest_rate}%</div>
                  </div>
                </div>
                
                <div className="chart-container">
                  <Plot
                    data={dsgeTraces}
                    layout={{
                      title: {
                        text: `DSGE Impact Simulation - ${selectedCountryData.name}`,
                        font: { size: 14, color: '#333' }
                      },
                      xaxis: { title: 'Quarters', gridcolor: '#f0f0f0' },
                      yaxis: { title: 'Impact (%)', gridcolor: '#f0f0f0' },
                      paper_bgcolor: 'rgba(0,0,0,0)',
                      plot_bgcolor: 'rgba(248,250,252,0.8)',
                      margin: { t: 40, l: 40, r: 20, b: 40 },
                      legend: { orientation: 'h', y: -0.2 },
                      hovermode: 'x unified'
                    }}
                    style={{width:'100%', height:'200px'}}
                    config={{displayModeBar: false}}
                  />
                </div>
              </>
            )}
          </div>

          {/* Global Impact Panel */}
          <div className="panel impact-panel">
            <div className="panel-header">
              <h3>Global Impact Summary</h3>
              <div className="impact-indicator">
                <span className="indicator-dot"></span>
                Live Simulation
              </div>
            </div>
            
            <div className="metrics-grid">
              {globalImpactData.map((metric, index) => (
                <div key={index} className="metric-card">
                  <div className="metric-label">{metric.metric}</div>
                  <div className="metric-value">
                    {typeof metric.value === 'number' ? metric.value.toFixed(1) : metric.value}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="chart-container">
              <Plot
                data={[{
                  x: capitalFlowData.map(d => d.region),
                  y: capitalFlowData.map(d => d.value),
                  type: 'bar',
                  marker: {
                    color: capitalFlowData.map(d => d.value > 0 ? '#4CAF50' : '#F44336'),
                    line: { color: 'rgba(0,0,0,0.1)', width: 1 }
                  },
                  text: capitalFlowData.map(d => `${d.value.toFixed(1)}%`),
                  textposition: 'auto',
                  hovertemplate: '<b>%{x}</b><br>Flow: %{y:.1f}%<extra></extra>'
                }]}
                layout={{
                  title: {
                    text: 'Global Capital Flows by Region',
                    font: { size: 14, color: '#333' }
                  },
                  xaxis: { title: 'Region' },
                  yaxis: { 
                    title: 'Flow (%)',
                    zeroline: true,
                    zerolinecolor: '#999',
                    zerolinewidth: 2
                  },
                  paper_bgcolor: 'rgba(0,0,0,0)',
                  plot_bgcolor: 'rgba(248,250,252,0.8)',
                  margin: { t: 40, l: 40, r: 20, b: 40 },
                  showlegend: false
                }}
                style={{width:'100%', height:'200px'}}
                config={{displayModeBar: false}}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}