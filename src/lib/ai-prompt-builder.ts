interface PromptConfig {
  roomType: string;
  interiorStyle: string;
}

const generalPromptVariations = {
  adjectives: ["comfortable", "stylish", "well-arranged", "tasteful", "modern", "cozy"],
  arrangements: ["thoughtfully arranged", "expertly placed", "professionally staged", "carefully positioned"],
  finishTerms: ["high-quality", "well-coordinated", "beautifully styled", "tastefully selected"]
};

const kitchenPromptVariations = {
  adjectives: ["functional", "elegant", "well-organized", "inviting", "pristine", "sophisticated"],
  arrangements: ["beautifully styled", "expertly arranged", "thoughtfully organized", "professionally presented"],
  finishTerms: ["coordinated elements", "stylish accessories", "tasteful details", "polished finishes"]
};

const bathroomPromptVariations = {
  adjectives: ["spa-like", "luxurious", "clean", "serene", "elegant", "refined"],
  arrangements: ["beautifully accessorized", "thoughtfully styled", "expertly coordinated", "tastefully appointed"],
  finishTerms: ["premium fixtures", "elegant accessories", "coordinated elements", "refined details"]
};

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function buildStagingPrompt({ roomType, interiorStyle }: PromptConfig): string {
  const roomTypeLower = roomType.toLowerCase();
  const styleLower = interiorStyle.toLowerCase();

  // Kitchen-specific prompting
  if (roomTypeLower.includes('kitchen')) {
    const adjective = randomChoice(kitchenPromptVariations.adjectives);
    const arrangement = randomChoice(kitchenPromptVariations.arrangements);
    const finish = randomChoice(kitchenPromptVariations.finishTerms);
    
    return `Stage this kitchen with ${adjective} ${styleLower} style elements. ${arrangement} countertops, backsplash, and kitchen accessories. ${finish} creating a welcoming space.`;
  }

  // Bathroom-specific prompting
  if (roomTypeLower.includes('bathroom')) {
    const adjective = randomChoice(bathroomPromptVariations.adjectives);
    const arrangement = randomChoice(bathroomPromptVariations.arrangements);
    const finish = randomChoice(bathroomPromptVariations.finishTerms);
    
    return `Stage this bathroom with ${adjective} ${styleLower} style design. ${arrangement} with towels, toiletries, and decor. ${finish} creating a welcoming atmosphere.`;
  }

  // General room prompting (living room, bedroom, dining room, etc.)
  const adjective = randomChoice(generalPromptVariations.adjectives);
  const arrangement = randomChoice(generalPromptVariations.arrangements);
  const finish = randomChoice(generalPromptVariations.finishTerms);
  
  return `Stage this ${roomTypeLower} with ${adjective} ${styleLower} style furniture. ${arrangement} furniture and decor. ${finish} interior design.`;
}