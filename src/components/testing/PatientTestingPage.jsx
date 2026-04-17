import React, { useState } from 'react';
import { PATIENTS, selectPatientForCase } from '../../data/patients';
import { Heart, Wind, User, Thermometer, Activity, Droplets, Weight } from 'lucide-react';

const MOCK_CASES = [
  { id: '1', title: 'Asthma', category: 'Respiratory' },
  { id: '2', title: 'Aortic Stenosis', category: 'Cardiology' },
  { id: '3', title: 'Pneumonia', category: 'Respiratory' },
  { id: '4', title: 'COPD', category: 'Pulmonology' },
  { id: '5', title: 'Pediatric Asthma', category: 'Pediatrics' },
];

function VitalChip({ label, value, icon: Icon, color = '#6ee7b7' }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10,
      padding: '8px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      minWidth: 80,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {Icon && <Icon size={11} style={{ color }} />}
        <span style={{ fontSize: 10, color: '#71717a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <span style={{ fontSize: 14, fontWeight: 700, color: '#f4f4f5' }}>{value}</span>
    </div>
  );
}

function PatientCard({ patient, isSelected, onClick }) {
  const conditionColor =
    patient.body_condition >= 90 ? '#4ade80' :
    patient.body_condition >= 70 ? '#6ee7b7' :
    patient.body_condition >= 50 ? '#fbbf24' : '#f87171';

  return (
    <div
      onClick={onClick}
      style={{
        background: isSelected
          ? 'linear-gradient(135deg, rgba(110,231,183,0.08) 0%, rgba(59,130,246,0.06) 100%)'
          : 'hsl(var(--card))',
        border: isSelected ? '1px solid rgba(110,231,183,0.35)' : '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16,
        padding: 20,
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: isSelected
          ? '0 0 0 1px rgba(110,231,183,0.2), 0 4px 24px rgba(0,0,0,0.3)'
          : '0 2px 8px rgba(0,0,0,0.3)',
        width: '100%',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
        {/* Avatar */}
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          overflow: 'hidden',
          background: 'rgba(110,231,183,0.1)',
          border: '1px solid rgba(255,255,255,0.1)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <img
            src={patient.photo}
            alt={patient.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: patient.photo_position || 'center' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='#6ee7b7' stroke-width='1.5'><path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/><circle cx='12' cy='7' r='4'/></svg></div>`;
            }}
          />
        </div>

        {/* Name + tags */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#f4f4f5' }}>{patient.name}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#6ee7b7',
              background: 'rgba(110,231,183,0.12)', border: '1px solid rgba(110,231,183,0.2)',
              borderRadius: 20, padding: '2px 8px',
            }}>{patient.blood_type}</span>
          </div>
          <div style={{ fontSize: 12, color: '#a1a1aa' }}>
            {patient.gender} · {patient.age} years old
          </div>
          <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>
            {patient.occupation}
          </div>
        </div>

        {/* Weight badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'rgba(255,255,255,0.05)', borderRadius: 8,
          padding: '4px 8px', flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#f4f4f5' }}>{patient.weight_kg} kg</span>
        </div>
      </div>

      {/* Vitals row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <VitalChip label="BP" value={`${patient.vitals.bp}`} icon={Activity} color="#f87171" />
        <VitalChip label="HR" value={`${patient.vitals.hr} bpm`} icon={Heart} color="#fb923c" />
        <VitalChip label="SpO₂" value={`${patient.vitals.spo2}%`} icon={Wind} color="#60a5fa" />
        <VitalChip label="Temp" value={`${patient.vitals.temp}°C`} icon={Thermometer} color="#fbbf24" />
      </div>

      {/* Body condition bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Body Condition</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: conditionColor }}>{patient.body_condition}%</span>
        </div>
        <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${patient.body_condition}%`,
            background: `linear-gradient(90deg, ${conditionColor}88, ${conditionColor})`,
            borderRadius: 99, transition: 'width 0.6s ease',
          }} />
        </div>
        <div style={{ fontSize: 10, color: '#71717a', marginTop: 5 }}>{patient.body_condition_label}</div>
      </div>

      {/* Suitable for */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {patient.appropriate_for.categories.map(cat => (
          <span key={cat} style={{
            fontSize: 10, color: '#a1a1aa',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6, padding: '2px 7px',
          }}>{cat}</span>
        ))}
      </div>
    </div>
  );
}

function PatientDetailPanel({ patient }) {
  if (!patient) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', color: '#71717a', fontSize: 14,
    }}>
      Select a patient to view details
    </div>
  );

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 14, overflow: 'hidden',
          background: 'rgba(110,231,183,0.1)', border: '1px solid rgba(110,231,183,0.2)',
          flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <img
            src={patient.photo}
            alt={patient.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: patient.photo_position || 'center' }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f5', marginBottom: 4 }}>{patient.name}</div>
          <div style={{ fontSize: 13, color: '#a1a1aa' }}>{patient.gender} · {patient.age} yrs · {patient.occupation}</div>
          <div style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>Blood type: {patient.blood_type} · {patient.weight_kg} kg</div>
        </div>
      </div>

      {/* Medical info sections */}
      {[
        { label: 'Past Medical History', value: patient.past_medical_history },
        { label: 'Current Medications', value: patient.medications },
        { label: 'Allergies', value: patient.allergies },
        { label: 'Social History', value: patient.social_history },
        { label: 'Family History', value: patient.family_history },
      ].map(({ label, value }) => (
        <div key={label} style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: '#6ee7b7',
            textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6,
          }}>{label}</div>
          <div style={{
            fontSize: 13, color: '#d4d4d8', lineHeight: 1.6,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10, padding: '10px 14px',
          }}>{value}</div>
        </div>
      ))}

      {/* Personality */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: '#fbbf24',
          textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6,
        }}>Patient Personality</div>
        <div style={{
          fontSize: 13, color: '#d4d4d8', lineHeight: 1.6,
          background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.12)',
          borderRadius: 10, padding: '10px 14px',
        }}>{patient.personality}</div>
      </div>

      {/* LLM System Prompt */}
      <div>
        <div style={{
          fontSize: 10, fontWeight: 700, color: '#c084fc',
          textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6,
        }}>LLM System Prompt</div>
        <pre style={{
          fontSize: 11, color: '#a1a1aa', lineHeight: 1.7, whiteSpace: 'pre-wrap',
          background: 'rgba(192,132,252,0.04)', border: '1px solid rgba(192,132,252,0.12)',
          borderRadius: 10, padding: '12px 14px', margin: 0,
          fontFamily: 'monospace',
        }}>{patient.system_prompt}</pre>
      </div>
    </div>
  );
}

export default function PatientTestingPage() {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [matchResult, setMatchResult] = useState(null);

  const handleMatchTest = (mockCase) => {
    const matched = selectPatientForCase(mockCase);
    setMatchResult({ case: mockCase, patient: matched });
    setSelectedPatient(matched);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'hsl(var(--background))',
      color: '#f4f4f5',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Top bar */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '16px 32px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', background: '#6ee7b7',
          boxShadow: '0 0 8px #6ee7b7',
        }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#6ee7b7', letterSpacing: '0.05em' }}>MEDUPAL</span>
        <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
        <span style={{ fontSize: 13, color: '#71717a' }}>Patient Testing Page</span>
        <span style={{
          marginLeft: 'auto', fontSize: 10, color: '#71717a',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 6, padding: '3px 8px',
        }}>localhost:5173/patient-testing</span>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 57px)' }}>

        {/* LEFT — Patient cards */}
        <div style={{
          width: 380, flexShrink: 0,
          borderRight: '1px solid rgba(255,255,255,0.07)',
          overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f4f4f5', marginBottom: 4 }}>Patient Roster</div>
            <div style={{ fontSize: 12, color: '#71717a' }}>{PATIENTS.length} patients · click to inspect</div>
          </div>

          {PATIENTS.map(p => (
            <PatientCard
              key={p.id}
              patient={p}
              isSelected={selectedPatient?.id === p.id}
              onClick={() => { setSelectedPatient(p); setMatchResult(null); }}
            />
          ))}
        </div>

        {/* MIDDLE — Detail panel */}
        <div style={{ flex: 1, borderRight: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <PatientDetailPanel patient={selectedPatient} />
        </div>

        {/* RIGHT — Match tester */}
        <div style={{ width: 300, flexShrink: 0, padding: 20, overflowY: 'auto' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f4f4f5', marginBottom: 4 }}>Case Matching Tester</div>
          <div style={{ fontSize: 12, color: '#71717a', marginBottom: 16 }}>
            Pick a case to test which patient gets selected
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MOCK_CASES.map(c => (
              <button
                key={c.id}
                onClick={() => handleMatchTest(c)}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                  color: '#f4f4f5',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(110,231,183,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              >
                <div style={{ fontSize: 13, fontWeight: 600 }}>{c.title}</div>
                <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>{c.category}</div>
              </button>
            ))}
          </div>

          {/* Match result */}
          {matchResult && (
            <div style={{
              marginTop: 20,
              background: 'rgba(110,231,183,0.06)',
              border: '1px solid rgba(110,231,183,0.2)',
              borderRadius: 12, padding: 14,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                Match Result
              </div>
              <div style={{ fontSize: 12, color: '#71717a', marginBottom: 4 }}>
                Case: <span style={{ color: '#f4f4f5', fontWeight: 600 }}>{matchResult.case.title}</span>
              </div>
              <div style={{ fontSize: 12, color: '#71717a', marginBottom: 10 }}>
                Category: <span style={{ color: '#f4f4f5' }}>{matchResult.case.category}</span>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, overflow: 'hidden',
                  background: 'rgba(110,231,183,0.1)', border: '1px solid rgba(110,231,183,0.2)',
                  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <img src={matchResult.patient.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.currentTarget.style.display = 'none'; }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f4f4f5' }}>{matchResult.patient.name}</div>
                  <div style={{ fontSize: 11, color: '#a1a1aa' }}>{matchResult.patient.gender} · {matchResult.patient.age} yrs</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
