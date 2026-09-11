import React, { useRef, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';

interface Dice3DProps {
  type: DiceType;
  result: number | null;
  isRolling: boolean;
  size?: number; // Size multiplier for multiple dice
}

// Helper to get theme color from CSS variable
function getThemeColor(): string {
  if (typeof window === 'undefined') return '#4a90e2';
  try {
    const root = getComputedStyle(document.documentElement);
    const primaryHsl = root.getPropertyValue('--primary').trim();
    
    // Create a temporary element to convert HSL to RGB
    const temp = document.createElement('div');
    temp.style.color = `hsl(${primaryHsl})`;
    document.body.appendChild(temp);
    const rgb = getComputedStyle(temp).color;
    document.body.removeChild(temp);
    
    // Extract RGB values and convert to hex
    const match = rgb.match(/\d+/g);
    if (match && match.length >= 3) {
      const r = parseInt(match[0]).toString(16).padStart(2, '0');
      const g = parseInt(match[1]).toString(16).padStart(2, '0');
      const b = parseInt(match[2]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
  } catch (e) {
    console.warn('Failed to get theme color:', e);
  }
  return '#4a90e2';
}

// D6 - Cube with numbers on each face
function D6Mesh({ result, isRolling, diceColor, size = 1 }: { result: number | null; isRolling: boolean; diceColor: string; size?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [rotationSpeed, setRotationSpeed] = useState({ x: 0, y: 0, z: 0 });
  const [targetRotation, setTargetRotation] = useState({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    if (isRolling) {
      setRotationSpeed({
        x: (Math.random() - 0.5) * 0.5,
        y: (Math.random() - 0.5) * 0.5,
        z: (Math.random() - 0.5) * 0.5,
      });
    } else if (result && meshRef.current) {
      // Standard dice layout: opposite faces sum to 7
      // 1 opposite 6, 2 opposite 5, 3 opposite 4
      const rotations: Record<number, { x: number; y: number; z: number }> = {
        1: { x: 0, y: 0, z: 0 }, // Top face
        6: { x: Math.PI, y: 0, z: 0 }, // Bottom face
        2: { x: -Math.PI / 2, y: 0, z: 0 }, // Front face
        5: { x: Math.PI / 2, y: 0, z: 0 }, // Back face
        3: { x: 0, y: -Math.PI / 2, z: 0 }, // Right face
        4: { x: 0, y: Math.PI / 2, z: 0 }, // Left face
      };
      const rotation = rotations[result] || rotations[1];
      setTargetRotation(rotation);
      setRotationSpeed({ x: 0, y: 0, z: 0 });
    }
  }, [isRolling, result]);

  useFrame(() => {
    if (meshRef.current) {
      if (isRolling) {
        meshRef.current.rotation.x += rotationSpeed.x;
        meshRef.current.rotation.y += rotationSpeed.y;
        meshRef.current.rotation.z += rotationSpeed.z;
      } else {
        meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRotation.x, 0.1);
        meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotation.y, 0.1);
        meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, targetRotation.z, 0.1);
      }
    }
  });

  const scale = 2 * size;
  const offset = 1.05 * size;

  return (
    <group ref={meshRef}>
      <mesh>
        <boxGeometry args={[scale, scale, scale]} />
        <meshStandardMaterial
          color={isRolling ? '#666' : diceColor}
          metalness={0.7}
          roughness={0.3}
          emissive={result === 6 ? '#ffd700' : '#000'}
          emissiveIntensity={result === 6 ? 0.3 : 0}
        />
      </mesh>
      {/* Numbers on each face - properly positioned and rotated */}
      {[
        { num: 1, pos: [0, offset, 0], rot: [0, 0, 0] }, // Top
        { num: 6, pos: [0, -offset, 0], rot: [Math.PI, 0, 0] }, // Bottom
        { num: 2, pos: [0, 0, offset], rot: [-Math.PI / 2, 0, 0] }, // Front
        { num: 5, pos: [0, 0, -offset], rot: [Math.PI / 2, 0, 0] }, // Back
        { num: 3, pos: [offset, 0, 0], rot: [0, -Math.PI / 2, 0] }, // Right
        { num: 4, pos: [-offset, 0, 0], rot: [0, Math.PI / 2, 0] }, // Left
      ].map(({ num, pos, rot }) => (
        <Text
          key={num}
          position={pos as [number, number, number]}
          rotation={rot as [number, number, number]}
          fontSize={0.5 * size}
          color={num === result && !isRolling ? '#fff' : '#888'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02 * size}
          outlineColor="#000"
        >
          {num}
        </Text>
      ))}
    </group>
  );
}

// D20 - Icosahedron
function D20Mesh({ result, isRolling, diceColor, size = 1 }: { result: number | null; isRolling: boolean; diceColor: string; size?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [rotationSpeed, setRotationSpeed] = useState({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    if (isRolling) {
      setRotationSpeed({
        x: (Math.random() - 0.5) * 0.5,
        y: (Math.random() - 0.5) * 0.5,
        z: (Math.random() - 0.5) * 0.5,
      });
    } else {
      setRotationSpeed({ x: 0, y: 0, z: 0 });
    }
  }, [isRolling]);

  useFrame(() => {
    if (meshRef.current && isRolling) {
      meshRef.current.rotation.x += rotationSpeed.x;
      meshRef.current.rotation.y += rotationSpeed.y;
      meshRef.current.rotation.z += rotationSpeed.z;
    }
  });

  const isCritical = result === 20 && !isRolling;

  return (
    <group ref={meshRef}>
      <mesh>
        <icosahedronGeometry args={[1.5 * size, 0]} />
        <meshStandardMaterial
          color={isRolling ? '#666' : diceColor}
          metalness={0.7}
          roughness={0.3}
          emissive={isCritical ? '#ffd700' : '#000'}
          emissiveIntensity={isCritical ? 0.5 : 0}
        />
      </mesh>
      {!isRolling && result && (
        <Text
          position={[0, 0, 1.8 * size]}
          fontSize={0.4 * size}
          color={isCritical ? '#ffd700' : '#fff'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02 * size}
          outlineColor="#000"
        >
          {result}
        </Text>
      )}
    </group>
  );
}

// D12 - Dodecahedron
function D12Mesh({ result, isRolling, diceColor, size = 1 }: { result: number | null; isRolling: boolean; diceColor: string; size?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [rotationSpeed, setRotationSpeed] = useState({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    if (isRolling) {
      setRotationSpeed({
        x: (Math.random() - 0.5) * 0.5,
        y: (Math.random() - 0.5) * 0.5,
        z: (Math.random() - 0.5) * 0.5,
      });
    } else {
      setRotationSpeed({ x: 0, y: 0, z: 0 });
    }
  }, [isRolling]);

  useFrame(() => {
    if (meshRef.current && isRolling) {
      meshRef.current.rotation.x += rotationSpeed.x;
      meshRef.current.rotation.y += rotationSpeed.y;
      meshRef.current.rotation.z += rotationSpeed.z;
    }
  });

  return (
    <group ref={meshRef}>
      <mesh>
        <dodecahedronGeometry args={[1.5 * size, 0]} />
        <meshStandardMaterial
          color={isRolling ? '#666' : diceColor}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      {!isRolling && result && (
        <Text
          position={[0, 0, 1.8 * size]}
          fontSize={0.35 * size}
          color="#fff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02 * size}
          outlineColor="#000"
        >
          {result}
        </Text>
      )}
    </group>
  );
}

// D8 - Octahedron
function D8Mesh({ result, isRolling, diceColor, size = 1 }: { result: number | null; isRolling: boolean; diceColor: string; size?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [rotationSpeed, setRotationSpeed] = useState({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    if (isRolling) {
      setRotationSpeed({
        x: (Math.random() - 0.5) * 0.5,
        y: (Math.random() - 0.5) * 0.5,
        z: (Math.random() - 0.5) * 0.5,
      });
    } else {
      setRotationSpeed({ x: 0, y: 0, z: 0 });
    }
  }, [isRolling]);

  useFrame(() => {
    if (meshRef.current && isRolling) {
      meshRef.current.rotation.x += rotationSpeed.x;
      meshRef.current.rotation.y += rotationSpeed.y;
      meshRef.current.rotation.z += rotationSpeed.z;
    }
  });

  return (
    <group ref={meshRef}>
      <mesh>
        <octahedronGeometry args={[1.5 * size, 0]} />
        <meshStandardMaterial
          color={isRolling ? '#666' : diceColor}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      {!isRolling && result && (
        <Text
          position={[0, 0, 1.8 * size]}
          fontSize={0.4 * size}
          color="#fff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02 * size}
          outlineColor="#000"
        >
          {result}
        </Text>
      )}
    </group>
  );
}

// D4 - Tetrahedron
function D4Mesh({ result, isRolling, diceColor, size = 1 }: { result: number | null; isRolling: boolean; diceColor: string; size?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [rotationSpeed, setRotationSpeed] = useState({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    if (isRolling) {
      setRotationSpeed({
        x: (Math.random() - 0.5) * 0.5,
        y: (Math.random() - 0.5) * 0.5,
        z: (Math.random() - 0.5) * 0.5,
      });
    } else {
      setRotationSpeed({ x: 0, y: 0, z: 0 });
    }
  }, [isRolling]);

  useFrame(() => {
    if (meshRef.current && isRolling) {
      meshRef.current.rotation.x += rotationSpeed.x;
      meshRef.current.rotation.y += rotationSpeed.y;
      meshRef.current.rotation.z += rotationSpeed.z;
    }
  });

  return (
    <group ref={meshRef}>
      <mesh>
        <tetrahedronGeometry args={[1.5 * size, 0]} />
        <meshStandardMaterial
          color={isRolling ? '#666' : diceColor}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      {!isRolling && result && (
        <Text
          position={[0, 0, 1.8 * size]}
          fontSize={0.4 * size}
          color="#fff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02 * size}
          outlineColor="#000"
        >
          {result}
        </Text>
      )}
    </group>
  );
}

// D10 - Pentagonal trapezohedron (simplified as octahedron for now)
function D10Mesh({ result, isRolling, diceColor, size = 1 }: { result: number | null; isRolling: boolean; diceColor: string; size?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [rotationSpeed, setRotationSpeed] = useState({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    if (isRolling) {
      setRotationSpeed({
        x: (Math.random() - 0.5) * 0.5,
        y: (Math.random() - 0.5) * 0.5,
        z: (Math.random() - 0.5) * 0.5,
      });
    } else {
      setRotationSpeed({ x: 0, y: 0, z: 0 });
    }
  }, [isRolling]);

  useFrame(() => {
    if (meshRef.current && isRolling) {
      meshRef.current.rotation.x += rotationSpeed.x;
      meshRef.current.rotation.y += rotationSpeed.y;
      meshRef.current.rotation.z += rotationSpeed.z;
    }
  });

  return (
    <group ref={meshRef}>
      <mesh>
        <octahedronGeometry args={[1.5 * size, 0]} />
        <meshStandardMaterial
          color={isRolling ? '#666' : diceColor}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      {!isRolling && result && (
        <Text
          position={[0, 0, 1.8 * size]}
          fontSize={0.4 * size}
          color="#fff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02 * size}
          outlineColor="#000"
        >
          {result}
        </Text>
      )}
    </group>
  );
}

function DiceScene({ type, result, isRolling, diceColor, size }: Dice3DProps & { diceColor: string }) {
  return (
    <>
      {/* Improved lighting - multiple lights for better illumination */}
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <directionalLight position={[-5, 5, -5]} intensity={0.8} />
      <pointLight position={[0, 5, 0]} intensity={0.6} />
      <pointLight position={[-5, -5, -5]} intensity={0.5} />
      <pointLight position={[5, -5, 5]} intensity={0.5} />
      
      {type === 'd4' && <D4Mesh result={result} isRolling={isRolling} diceColor={diceColor} size={size} />}
      {type === 'd6' && <D6Mesh result={result} isRolling={isRolling} diceColor={diceColor} size={size} />}
      {type === 'd8' && <D8Mesh result={result} isRolling={isRolling} diceColor={diceColor} size={size} />}
      {type === 'd10' && <D10Mesh result={result} isRolling={isRolling} diceColor={diceColor} size={size} />}
      {type === 'd12' && <D12Mesh result={result} isRolling={isRolling} diceColor={diceColor} size={size} />}
      {type === 'd20' && <D20Mesh result={result} isRolling={isRolling} diceColor={diceColor} size={size} />}
      {type === 'd100' && <D20Mesh result={result} isRolling={isRolling} diceColor={diceColor} size={size} />}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={!isRolling && !!result}
        autoRotateSpeed={1}
      />
    </>
  );
}

export function Dice3D({ type, result, isRolling, size = 1 }: Dice3DProps) {
  const [diceColor, setDiceColor] = useState('#4a90e2');

  useEffect(() => {
    // Update color when theme changes
    const updateColor = () => {
      setDiceColor(getThemeColor());
    };
    updateColor();
    // Listen for theme changes
    const observer = new MutationObserver(updateColor);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  const canvasSize = Math.max(200, 200 * size);

  return (
    <div className="relative" style={{ width: `${canvasSize}px`, height: `${canvasSize}px` }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <DiceScene type={type} result={result} isRolling={isRolling} diceColor={diceColor} size={size} />
        </Suspense>
      </Canvas>
      {!isRolling && result && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
          <div className={cn(
            'text-3xl font-display font-bold',
            result === 20 && type === 'd20' ? 'text-accent' : 'text-primary'
          )}>
            {result}
          </div>
        </div>
      )}
    </div>
  );
}
