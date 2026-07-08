type ClassValue = string | undefined | null | false | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  function process(input: ClassValue) {
    if (!input) return;
    if (typeof input === 'string') {
      classes.push(input.trim());
    } else if (Array.isArray(input)) {
      input.forEach(process);
    }
  }

  process(inputs);
  return classes.filter(Boolean).join(' ');
}
