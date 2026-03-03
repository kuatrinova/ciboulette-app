"use client";

interface PillSelectorProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export default function PillSelector({
  label,
  options,
  selected,
  onChange,
}: PillSelectorProps) {
  const toggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className="w-full">
      <p className="text-sm font-medium text-[#555] mb-2">{label}</p>
      <div className="flex gap-3">
        {options.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              className={`
                flex-1 py-3 rounded-xl text-sm font-medium
                transition-all duration-200 ease-out
                ${
                  isSelected
                    ? "bg-[#6B7B3A] text-white shadow-md scale-[1.02]"
                    : "bg-white text-[#555] border border-[#ddd] hover:border-[#6B7B3A] hover:text-[#6B7B3A]"
                }
              `}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
