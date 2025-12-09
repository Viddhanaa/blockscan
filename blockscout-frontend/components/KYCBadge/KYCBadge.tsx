import React, { useEffect, useState } from 'react';
import {
  Badge,
  Icon,
  Spinner,
  Tooltip,
  Text,
  Box,
  Flex,
} from '@chakra-ui/react';
import { CheckCircleIcon, WarningIcon, QuestionIcon } from '@chakra-ui/icons';

// KYC Status types
type KYCStatus = 'verified' | 'pending' | 'unverified' | 'loading' | 'error';

interface KYCData {
  status: KYCStatus;
  verifiedAt?: string;
  expiresAt?: string;
  verificationLevel?: 'basic' | 'advanced' | 'institutional';
  message?: string;
}

interface KYCBadgeProps {
  address: string;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
  apiUrl?: string;
}

// Status configuration
const statusConfig = {
  verified: {
    colorScheme: 'green',
    icon: CheckCircleIcon,
    label: 'KYC Verified',
    bg: '#28A745',
  },
  pending: {
    colorScheme: 'yellow',
    icon: WarningIcon,
    label: 'KYC Pending',
    bg: '#FFC107',
  },
  unverified: {
    colorScheme: 'gray',
    icon: QuestionIcon,
    label: 'Not Verified',
    bg: '#6C757D',
  },
  error: {
    colorScheme: 'red',
    icon: WarningIcon,
    label: 'Error',
    bg: '#DC3545',
  },
  loading: {
    colorScheme: 'blue',
    icon: QuestionIcon,
    label: 'Loading...',
    bg: '#4A90E2',
  },
};

// Size configuration
const sizeConfig = {
  sm: {
    fontSize: '10px',
    px: 2,
    py: 0.5,
    iconSize: 3,
  },
  md: {
    fontSize: '12px',
    px: 3,
    py: 1,
    iconSize: 4,
  },
  lg: {
    fontSize: '14px',
    px: 4,
    py: 1.5,
    iconSize: 5,
  },
};

export const KYCBadge: React.FC<KYCBadgeProps> = ({
  address,
  showTooltip = true,
  size = 'md',
  apiUrl = process.env.NEXT_PUBLIC_KYC_API_URL || 'http://localhost:3001',
}) => {
  const [kycData, setKycData] = useState<KYCData>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    const fetchKYCStatus = async () => {
      if (!address) {
        setKycData({ status: 'unverified' });
        return;
      }

      try {
        // Use the correct KYC API endpoint that matches the actual API
        const response = await fetch(`${apiUrl}/rpc/check_kyc?address=${address}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          if (response.status === 404) {
            setKycData({ status: 'unverified' });
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Map the actual API response to our KYCData format
        // API returns: { success, data: { address, isKYCApproved, approvedAt, approvedAtTimestamp } }
        setKycData({
          status: data.data?.isKYCApproved ? 'verified' : 'unverified',
          verifiedAt: data.data?.approvedAt,
          // Note: Current API doesn't return expiresAt or verificationLevel
          expiresAt: undefined,
          verificationLevel: undefined,
        });
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        console.error('Failed to fetch KYC status:', error);
        setKycData({ 
          status: 'error',
          message: 'Failed to fetch KYC status',
        });
      }
    };

    fetchKYCStatus();
    return () => controller.abort();
  }, [address, apiUrl]);

  const config = statusConfig[kycData.status];
  const sizes = sizeConfig[size];

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTooltipContent = () => {
    if (kycData.status === 'loading') {
      return 'Checking KYC status...';
    }
    if (kycData.status === 'error') {
      return kycData.message || 'Error checking KYC status';
    }
    if (kycData.status === 'verified') {
      const parts = ['KYC Verified'];
      if (kycData.verificationLevel) {
        parts.push(`Level: ${kycData.verificationLevel}`);
      }
      if (kycData.verifiedAt) {
        parts.push(`Since: ${formatDate(kycData.verifiedAt)}`);
      }
      if (kycData.expiresAt) {
        parts.push(`Expires: ${formatDate(kycData.expiresAt)}`);
      }
      return parts.join('\n');
    }
    if (kycData.status === 'pending') {
      return 'KYC verification is pending';
    }
    return 'This address has not completed KYC verification';
  };

  const BadgeContent = (
    <Badge
      display="inline-flex"
      alignItems="center"
      gap={1}
      px={sizes.px}
      py={sizes.py}
      borderRadius="full"
      bg={config.bg}
      color="white"
      fontSize={sizes.fontSize}
      fontWeight="600"
      textTransform="uppercase"
      letterSpacing="0.5px"
      cursor={showTooltip ? 'help' : 'default'}
      _hover={{
        opacity: 0.9,
        transform: 'scale(1.02)',
      }}
      transition="all 0.2s ease"
    >
      {kycData.status === 'loading' ? (
        <Spinner size="xs" color="white" />
      ) : (
        <Icon as={config.icon} boxSize={sizes.iconSize} />
      )}
      <Text as="span">{config.label}</Text>
    </Badge>
  );

  if (!showTooltip) {
    return BadgeContent;
  }

  return (
    <Tooltip
      label={
        <Box whiteSpace="pre-line" textAlign="center">
          {getTooltipContent()}
        </Box>
      }
      placement="top"
      hasArrow
      bg="gray.800"
      color="white"
      px={3}
      py={2}
      borderRadius="md"
    >
      {BadgeContent}
    </Tooltip>
  );
};

// Compact version for inline display
export const KYCBadgeCompact: React.FC<{
  address: string;
  apiUrl?: string;
}> = ({ address, apiUrl }) => {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const baseUrl = apiUrl || process.env.NEXT_PUBLIC_KYC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    const controller = new AbortController();

    const checkStatus = async () => {
      try {
        // Use the correct KYC API endpoint
        const response = await fetch(`${baseUrl}/rpc/check_kyc?address=${address}`, {
          signal: controller.signal,
        });
        if (response.ok) {
          const data = await response.json();
          // Map actual API response: { success, data: { isKYCApproved } }
          setIsVerified(data.data?.isKYCApproved === true);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        setIsVerified(null);
      }
    };
    checkStatus();
    return () => controller.abort();
  }, [address, baseUrl]);

  if (isVerified === null) return null;
  if (!isVerified) return null;

  return (
    <Tooltip label="KYC Verified" placement="top" hasArrow>
      <Flex
        as="span"
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        w={5}
        h={5}
        bg="#28A745"
        borderRadius="full"
        ml={1}
      >
        <Icon as={CheckCircleIcon} boxSize={3} color="white" />
      </Flex>
    </Tooltip>
  );
};

export default KYCBadge;
