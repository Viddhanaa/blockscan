import React, { useState, useCallback } from 'react';
import {
  Button,
  Icon,
  useToast,
  Tooltip,
  Spinner,
  Text,
  Flex,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  VStack,
  Code,
  Divider,
} from '@chakra-ui/react';
import { AddIcon, CheckIcon, WarningIcon } from '@chakra-ui/icons';

// Viddhana Chain Configuration
const VIDDHANA_CHAIN_CONFIG = {
  chainId: '0x539', // 1337 in hex
  chainName: 'Viddhana Chain',
  nativeCurrency: {
    name: 'BTCD',
    symbol: 'BTCD',
    decimals: 18,
  },
  rpcUrls: ['http://localhost:8545'],
  blockExplorerUrls: ['http://localhost:4000'],
  iconUrls: ['/icon.svg'],
};

// For production, update with actual values
const VIDDHANA_CHAIN_CONFIG_PROD = {
  chainId: '0x539',
  chainName: 'Viddhana Chain',
  nativeCurrency: {
    name: 'BTCD',
    symbol: 'BTCD',
    decimals: 18,
  },
  rpcUrls: ['https://rpc.viddhana.io'],
  blockExplorerUrls: ['https://explorer.viddhana.io'],
  iconUrls: ['https://explorer.viddhana.io/icon.svg'],
};

type NetworkStatus = 'idle' | 'adding' | 'switching' | 'success' | 'error';

interface AddNetworkButtonProps {
  variant?: 'solid' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  colorScheme?: string;
  showLabel?: boolean;
  useProduction?: boolean;
  customConfig?: Partial<typeof VIDDHANA_CHAIN_CONFIG>;
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      isMetaMask?: boolean;
      on?: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}

export const AddNetworkButton: React.FC<AddNetworkButtonProps> = ({
  variant = 'solid',
  size = 'md',
  colorScheme = 'blue',
  showLabel = true,
  useProduction = false,
  customConfig = {},
}) => {
  const [status, setStatus] = useState<NetworkStatus>('idle');
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const getChainConfig = useCallback(() => {
    const baseConfig = useProduction ? VIDDHANA_CHAIN_CONFIG_PROD : VIDDHANA_CHAIN_CONFIG;
    return { ...baseConfig, ...customConfig };
  }, [useProduction, customConfig]);

  const checkMetaMask = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    return Boolean(window.ethereum?.isMetaMask);
  }, []);

  const isChainAdded = useCallback(async (): Promise<boolean> => {
    if (!window.ethereum) return false;
    
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      return chainId === getChainConfig().chainId;
    } catch {
      return false;
    }
  }, [getChainConfig]);

  const switchToNetwork = useCallback(async (): Promise<boolean> => {
    if (!window.ethereum) return false;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: getChainConfig().chainId }],
      });
      return true;
    } catch (error: unknown) {
      const err = error as { code?: number };
      // Error code 4902 means chain not added
      if (err.code === 4902) {
        return false;
      }
      throw error;
    }
  }, [getChainConfig]);

  const addNetwork = useCallback(async () => {
    if (!checkMetaMask()) {
      onOpen();
      return;
    }

    setStatus('adding');

    try {
      // First, try to switch to the network (in case it's already added)
      const alreadyOnChain = await isChainAdded();
      if (alreadyOnChain) {
        setStatus('success');
        toast({
          title: 'Already Connected',
          description: 'You are already on Viddhana Chain!',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
        setTimeout(() => setStatus('idle'), 2000);
        return;
      }

      setStatus('switching');
      const switched = await switchToNetwork();
      
      if (!switched) {
        // Network not added, add it
        setStatus('adding');
        const config = getChainConfig();
        
        await window.ethereum!.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: config.chainId,
            chainName: config.chainName,
            nativeCurrency: config.nativeCurrency,
            rpcUrls: config.rpcUrls,
            blockExplorerUrls: config.blockExplorerUrls,
            iconUrls: config.iconUrls,
          }],
        });
      }

      setStatus('success');
      toast({
        title: 'Network Added!',
        description: 'Viddhana Chain has been added to MetaMask',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error: unknown) {
      console.error('Failed to add network:', error);
      setStatus('error');
      
      const err = error as { code?: number; message?: string };
      let errorMessage = 'Failed to add network to MetaMask';
      
      if (err.code === 4001) {
        errorMessage = 'Request was rejected by user';
      } else if (err.message) {
        errorMessage = err.message;
      }

      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      
      setTimeout(() => setStatus('idle'), 2000);
    }
  }, [checkMetaMask, isChainAdded, switchToNetwork, getChainConfig, toast, onOpen]);

  const getButtonContent = () => {
    switch (status) {
      case 'adding':
      case 'switching':
        return (
          <>
            <Spinner size="sm" mr={showLabel ? 2 : 0} />
            {showLabel && 'Adding...'}
          </>
        );
      case 'success':
        return (
          <>
            <Icon as={CheckIcon} mr={showLabel ? 2 : 0} />
            {showLabel && 'Added!'}
          </>
        );
      case 'error':
        return (
          <>
            <Icon as={WarningIcon} mr={showLabel ? 2 : 0} />
            {showLabel && 'Failed'}
          </>
        );
      default:
        return (
          <>
            <Icon as={AddIcon} mr={showLabel ? 2 : 0} />
            {showLabel && 'Add to MetaMask'}
          </>
        );
    }
  };

  const getButtonColorScheme = () => {
    if (status === 'success') return 'green';
    if (status === 'error') return 'red';
    return colorScheme;
  };

  return (
    <>
      <Tooltip
        label="Add Viddhana Chain to MetaMask"
        placement="top"
        hasArrow
        isDisabled={status !== 'idle'}
      >
        <Button
          variant={variant}
          size={size}
          colorScheme={getButtonColorScheme()}
          onClick={addNetwork}
          isDisabled={status === 'adding' || status === 'switching'}

          px={showLabel ? undefined : 3}
          background={status === 'idle' ? 'linear-gradient(90deg, #4A90E2 0%, #00C6FF 100%)' : undefined}
          _hover={{
            background: status === 'idle' ? 'linear-gradient(90deg, #3A80D2 0%, #00B6EF 100%)' : undefined,
            transform: 'translateY(-1px)',
            boxShadow: 'lg',
          }}
          transition="all 0.2s ease"
        >
          {getButtonContent()}
        </Button>
      </Tooltip>

      {/* MetaMask Not Found Modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader>MetaMask Required</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              <Text>
                MetaMask is required to add Viddhana Chain to your wallet.
                Please install MetaMask and refresh the page.
              </Text>
              
              <Button
                as="a"
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                colorScheme="orange"
                leftIcon={<span>🦊</span>}
              >
                Install MetaMask
              </Button>

              <Divider />

              <Text fontSize="sm" color="gray.600">
                Or add the network manually with these details:
              </Text>

              <VStack align="stretch" spacing={2} fontSize="sm">
                <Flex justify="space-between">
                  <Text fontWeight="bold">Network Name:</Text>
                  <Code>{getChainConfig().chainName}</Code>
                </Flex>
                <Flex justify="space-between">
                  <Text fontWeight="bold">Chain ID:</Text>
                  <Code>1337</Code>
                </Flex>
                <Flex justify="space-between">
                  <Text fontWeight="bold">Currency:</Text>
                  <Code>{getChainConfig().nativeCurrency.symbol}</Code>
                </Flex>
                <Flex justify="space-between">
                  <Text fontWeight="bold">RPC URL:</Text>
                  <Code fontSize="xs">{getChainConfig().rpcUrls[0]}</Code>
                </Flex>
              </VStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

// Compact icon-only version
export const AddNetworkIconButton: React.FC<{
  size?: 'sm' | 'md' | 'lg';
}> = ({ size = 'md' }) => {
  return <AddNetworkButton size={size} showLabel={false} variant="ghost" />;
};

export default AddNetworkButton;
