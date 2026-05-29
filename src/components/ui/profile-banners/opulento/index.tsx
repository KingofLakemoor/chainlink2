import React from 'react';
import './styles.css';

interface OpulentoVaultProps {
  isStatic?: boolean;
}

const OpulentoVaultBanner: React.FC<OpulentoVaultProps> = ({ isStatic = false }) => {
  return (
    <div className={`opulento-vault-banner-container ${isStatic ? 'static' : ''}`}>
      <div className="opulento-vault-layer-1" />
      <div className="opulento-vault-layer-2" />
      <div className="opulento-vault-overlay" />
    </div>
  );
};

export { OpulentoVaultBanner };
