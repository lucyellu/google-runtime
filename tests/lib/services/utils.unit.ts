import { expect } from 'chai';

import { generateResponseText } from '@/lib/services/utils';

describe('services utils', () => {
  it('generateResponseText', () => {
    expect(generateResponseText('')).to.eql('🔊');
    expect(generateResponseText('<speak>random <bold>bold text</bold> <audio>audio url</audio></speak>')).to.eql(
      'random bold text audio url'
    );
  });
});
