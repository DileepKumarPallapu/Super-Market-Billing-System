import React, { useState } from 'react';
import { getProductAsset } from '../data/productAssets';

export default function ProductImage({
  src,
  alt = 'Product',
  category,
  size = 56,
  className = '',
  style = {},
  productId
}) {
  const [hasError, setHasError] = useState(false);

  // Lookup verified asset by ID, name, or product object
  const asset = getProductAsset(productId || alt);

  // Verified asset vector illustration is always prioritized for 100% reliability
  const effectiveSrc = !hasError ? (asset?.image || src || asset?.fallback) : asset?.fallback;

  const numSize = typeof size === 'number' ? size : parseInt(size, 10) || 56;
  const isCardSize = numSize >= 100;

  const dimensionStyle = {
    width: `${numSize}px`,
    height: `${numSize}px`,
    minWidth: `${numSize}px`,
    minHeight: `${numSize}px`,
    borderRadius: isCardSize ? '14px' : '10px',
    objectFit: 'contain',
    background: 'var(--bg-card, #FFFFFF)',
    border: '1px solid var(--border-soft, #E6E0D9)',
    display: 'inline-block',
    flexShrink: 0,
    verticalAlign: 'middle',
    boxShadow: isCardSize ? '0 4px 12px rgba(75, 33, 66, 0.05)' : '0 1px 3px rgba(0,0,0,0.04)',
    padding: isCardSize ? '4px' : '2px',
    ...style
  };

  if (effectiveSrc) {
    return (
      <img
        src={effectiveSrc}
        alt={alt || asset?.name || 'Supermarket Product'}
        loading="lazy"
        className={`product-thumb ${className}`}
        style={dimensionStyle}
        onError={() => setHasError(true)}
      />
    );
  }

  // Graceful category fallback container
  return (
    <div
      className={`product-thumb product-thumb-fallback ${className}`}
      style={{
        ...dimensionStyle,
        display: 'grid',
        placeItems: 'center',
        background: 'var(--bg-porcelain, #F7F4EF)',
        color: 'var(--brand-primary, #4B2142)',
        fontSize: `${Math.round(numSize * 0.35)}px`,
        fontWeight: 700
      }}
      title={alt}
      role="img"
      aria-label={alt}
    >
      {(alt || 'P').charAt(0).toUpperCase()}
    </div>
  );
}
