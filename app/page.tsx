'use client';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { useState, useEffect } from 'react';
import { useRouter,redirect } from 'next/navigation';  
import { useAppSelector } from '@/redux/hooks';
import { Spinner } from '@/components/common';

const Container = styled.div`
  width: 100%;
  height: 100vh;
  background: #ffffff; /* Black background */
  color: black; /* White text */
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  overflow: hidden;
  position: relative;
`;

const Logo = styled(motion.img).withConfig({
  shouldForwardProp: (prop) => prop !== 'visible', 
})<{ visible: boolean }>`
  width: 200px;
  height: auto;
  margin-bottom: 20px;
  opacity: ${(props) => (props.visible ? 1 : 0)};
  transition: opacity 1s ease;
`;

const Slogan = styled(motion.h1).withConfig({
  shouldForwardProp: (prop) => prop !== 'visible',
})<{ visible: boolean }>`
  font-size: 2rem;
  font-weight: bold;
  text-align: center;
  margin-bottom: 20px;
  opacity: ${(props) => (props.visible ? 1 : 0)};
  transition: opacity 1s ease;
`;

const Subtitle = styled(motion.p).withConfig({
  shouldForwardProp: (prop) => prop !== 'visible',
})<{ visible: boolean }>`
  font-size: 1.2rem;
  text-align: center;
  max-width: 600px;
  margin-bottom: 30px;
  font-family: 'Roboto', sans-serif;
  opacity: ${(props) => (props.visible ? 1 : 0)};
  transition: opacity 1s ease;
`;

const Button = styled.button`
  padding: 15px 30px;
  background: #3B6B9B;
  border: none;
  border-radius: 5px;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  &:hover {
    background: #3B4B4B;
  }
`;

const Footer = styled.div`
  position: absolute;
  bottom: 10px;
  width: 100%;
  text-align: center;
  color: gray;
  font-size: 0.9rem;
`;

const NetworkGraph = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.0); /* Transparent black */
  pointer-events: none;
  overflow: hidden;
`;

const Node = styled(motion.div)`
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: black; /* White nodes */
  opacity: 0;
  pointer-events: none;
`;

const Page = () => {
  const { isLoading, isAuthenticated } = useAppSelector(state => state.auth);
  
  const [animationComplete, setAnimationComplete] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [nodes, setNodes] = useState<{ x: number; y: number }[]>([]);
  const router = useRouter();  
  

   // Authentication and rendering effect
   useEffect(() => {
    if (isAuthenticated) {
      redirect('/dashboard'); // if user logged in, redirect to /dashboard 
    } else if (!isLoading) {
      console.log("OK");
    }
  }, [isAuthenticated, isLoading, router]);

  const generateClusteredPositions = (nodeCount: number, width: number, height: number) => {
    const clusterCenterX = width / 2;
    const clusterCenterY = height / 2;
    const radius = 200;

    const nodes = [];
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * 2 * Math.PI;
      const x = clusterCenterX + radius * Math.cos(angle);
      const y = clusterCenterY + radius * Math.sin(angle);
      nodes.push({ x, y });
    }
    return nodes;
  };

  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const updateWindowSize = () => {
        setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      };

      updateWindowSize();
      window.addEventListener('resize', updateWindowSize);
      return () => window.removeEventListener('resize', updateWindowSize);
    }
  }, []);

  useEffect(() => {
    if (windowSize.width > 0 && windowSize.height > 0) {
      const newNodes = generateClusteredPositions(600, windowSize.width, windowSize.height);
      setNodes(newNodes);
    }
  }, [windowSize]);

  
  const handleAnimationComplete = () => {
    setAnimationComplete(true);
  };

  useEffect(() => {
    const timer = setTimeout(() => setAnimationComplete(true), 2000); 
    return () => clearTimeout(timer);
  }, []);

  const handleExploreClick = () => {
    router.push('/auth/login');  
  };

  return (
    <Container>
      <NetworkGraph>
        {nodes.map((node, index) => (
          <Node
            key={index}
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              opacity: 0,
            }}
            animate={{
              x: node.x,
              y: node.y,
              opacity: animationComplete ? 0 : 0.8,
              transition: {
                duration: 1.2,
                ease: 'easeInOut',
                x: { type: 'spring', stiffness: 10, damping: 10 },
                y: { type: 'spring', stiffness: 10, damping: 10 },
                onComplete: handleAnimationComplete,
              },
            }}
          />
        ))}
      </NetworkGraph>

      
      {animationComplete && (
        <>
          <Logo
            src="https://nsa.deeper.la/deeper-logo.png"
            alt="Logo"
            visible={animationComplete}
          />

          <Slogan visible={animationComplete}>
            Insights Beyond the Networks
          </Slogan>

          <Subtitle visible={animationComplete}>
            Discover how connections shape influence. With NSA, uncover Social Media’s unseen segments and drive smarter decisions.
          </Subtitle>
          <Button onClick={handleExploreClick}>Explore Now</Button>
          <Footer>Copyright © 2025 - All rights reserved.</Footer>
        </>
      )}
    </Container>
  );
};

export default Page;
