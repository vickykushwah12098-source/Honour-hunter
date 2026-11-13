import React from 'react';
import { canCraftRecipe, CRAFT_RECIPES } from '../game/rules';
import { CraftRecipe, CraftRecipeId, HudSnapshot, ResourceKind } from '../game/types';

interface CraftingModalProps {
  hud: HudSnapshot;
  onCraft: (recipeId: CraftRecipeId) => void;
  onClose: () => void;
}

const RESOURCE_LABELS: Record<ResourceKind, { label: string; dot: string }> = {
  herb: { label: 'Herb', dot: '#4be3b0' },
  ore: { label: 'Ore', dot: '#7dc5ff' },
  wood: { label: 'Wood', dot: '#d69f56' },
};

const TIER_ROMAN = ['', 'I', 'II', 'III'];

export const CraftingModal: React.FC<CraftingModalProps> = ({ hud, onCraft, onClose }) => {
  const { crafting, atCraftingStation, nearestStationName, nearestStationDist } = hud;

  const renderRecipeCard = (recipe: CraftRecipe) => {
    const check = canCraftRecipe(crafting, recipe.id);
    const canExecute = atCraftingStation && check.allowed;

    const alreadyOwned =
      (recipe.category === 'weapon' && recipe.tier !== undefined && crafting.weaponTier >= recipe.tier) ||
      (recipe.category === 'armor' && recipe.tier !== undefined && crafting.armorTier >= recipe.tier);

    const catTag =
      recipe.category === 'potion'
        ? 'Potion'
        : recipe.category === 'weapon'
        ? 'Weapon'
        : 'Armor';

    return (
      <div
        key={recipe.id}
        className="rounded-md border border-[#324657] bg-[#101a23] p-3 flex flex-col justify-between gap-2.5"
      >
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#d4a44a] font-semibold">
                {catTag}
              </span>
              <h3 className="font-gothic text-sm font-bold text-[#f2ece0] leading-snug">
                {recipe.name}
              </h3>
            </div>
            {alreadyOwned && (
              <span className="px-2 py-0.5 rounded bg-[#183829] border border-[#3e7d5d] text-[10px] font-semibold text-[#84e3b0] shrink-0">
                Forged
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#9eb2c0] mt-1 leading-snug">{recipe.description}</p>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#20303d]">
          <div className="flex flex-wrap items-center gap-1.5">
            {(['herb', 'ore', 'wood'] as const).map((kind) => {
              const req = recipe.cost[kind];
              if (!req) return null;
              const hasEnough = crafting.inventory[kind] >= req;
              return (
                <span
                  key={kind}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums border ${
                    hasEnough
                      ? 'border-[#33574a] bg-[#132620] text-[#a2ecc7]'
                      : 'border-[#5e2c2c] bg-[#261416] text-[#f09b95]'
                  }`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: RESOURCE_LABELS[kind].dot }}
                  />
                  {req} {RESOURCE_LABELS[kind].label}
                </span>
              );
            })}
          </div>

          <button
            type="button"
            disabled={!canExecute}
            onClick={() => onCraft(recipe.id)}
            aria-label={`Craft ${recipe.name}`}
            className={`px-3 py-1.5 rounded text-xs font-bold tracking-wide shrink-0 transition-colors ${
              canExecute
                ? 'border border-[#e3b764] bg-[#a86a24] hover:bg-[#bf7b2c] text-[#faf6ee] cursor-pointer'
                : 'border border-[#2e3e4a] bg-[#162029] text-[#6d808f] cursor-not-allowed'
            }`}
          >
            {alreadyOwned
              ? 'Owned'
              : !atCraftingStation
              ? 'Need Station'
              : check.allowed
              ? 'Craft'
              : check.reason}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-5"
      style={{ backgroundColor: 'rgba(7, 12, 18, 0.78)' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Crafting Workbench"
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-[#4a6479] p-4 sm:p-6"
        style={{
          backgroundColor: 'rgba(13, 21, 29, 0.97)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.85)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#2b3c4a] pb-3 mb-3">
          <div>
            <h2 className="font-gothic text-lg sm:text-xl font-bold text-[#ece5d7] tracking-wider">
              CRAFTING WORKBENCH
            </h2>
            <p
              className={`text-xs mt-0.5 font-medium ${
                atCraftingStation ? 'text-[#7ce0ab]' : 'text-[#e5b963]'
              }`}
            >
              {atCraftingStation
                ? `At ${nearestStationName} · Ready to Craft`
                : `Move within 4m of an Anvil Forge or Alchemist Table to craft (nearest: ${nearestStationDist}m)`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Crafting Workbench"
            className="px-3 py-1.5 rounded border border-[#455c6e] bg-[#172430] hover:bg-[#223444] text-xs font-semibold text-[#e6dfd3] cursor-pointer"
          >
            Close [B]
          </button>
        </div>

        {/* Inventory & Equipped Gear Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
          {(['herb', 'ore', 'wood'] as const).map((kind) => (
            <div
              key={kind}
              className="rounded border border-[#2c3f4f] bg-[#0e1720] px-2.5 py-1.5 flex items-center justify-between"
            >
              <span className="inline-flex items-center gap-1.5 text-[11px] text-[#b4c4d0]">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: RESOURCE_LABELS[kind].dot }}
                />
                {RESOURCE_LABELS[kind].label}
              </span>
              <span className="font-gothic text-sm font-bold text-[#f2ece0] tabular-nums">
                {crafting.inventory[kind]}
              </span>
            </div>
          ))}
          <div className="rounded border border-[#2c3f4f] bg-[#0e1720] px-2.5 py-1.5 flex items-center justify-between">
            <span className="text-[11px] text-[#b4c4d0]">Blade</span>
            <span className="font-gothic text-xs font-bold text-[#8fd4f5]">
              Tier {TIER_ROMAN[crafting.weaponTier]}
            </span>
          </div>
          <div className="rounded border border-[#2c3f4f] bg-[#0e1720] px-2.5 py-1.5 flex items-center justify-between">
            <span className="text-[11px] text-[#b4c4d0]">Armor</span>
            <span className="font-gothic text-xs font-bold text-[#f0c56e]">
              Tier {TIER_ROMAN[crafting.armorTier]}
            </span>
          </div>
        </div>

        {/* Recipe Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {CRAFT_RECIPES.map(renderRecipeCard)}
        </div>
      </div>
    </div>
  );
};
