import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { isSignedOutFromServerTiming, setLibs } from '../../upp/scripts/utils.js';

describe('Libs', () => {
  it('Default Libs', () => {
    const libs = setLibs('/libs');
    expect(libs).to.equal('https://main--milo--adobecom.aem.live/libs');
  });

  describe('Server Timing signed-out status', () => {
    let navigation;
    let cookie;

    beforeEach(() => {
      navigation = sinon.stub(window.performance, 'getEntriesByType');
      navigation.returns([{ serverTiming: [{ name: 'sis', description: '0' }] }]);
      cookie = sinon.stub(document, 'cookie').get(() => '');
    });

    afterEach(() => {
      sinon.restore();
    });

    it('uses an explicit signed-out signal without a sign-in cookie', () => {
      expect(isSignedOutFromServerTiming('acomsis')).to.be.true;
    });

    it('requires IMS for positive, unknown, or missing status', () => {
      ['1', '', 'unknown'].forEach((description) => {
        navigation.returns([{ serverTiming: [{ name: 'sis', description }] }]);
        expect(isSignedOutFromServerTiming('acomsis')).to.be.false;
      });
      [[], [{}], [{ serverTiming: [] }], [{ serverTiming: [{ name: 'other', description: '0' }] }]]
        .forEach((entries) => {
          navigation.returns(entries);
          expect(isSignedOutFromServerTiming('acomsis')).to.be.false;
        });
    });

    it('requires IMS when the current environment has a sign-in cookie', () => {
      cookie.get(() => 'other=1; acomsis=1');
      expect(isSignedOutFromServerTiming('acomsis')).to.be.false;
      cookie.get(() => 'acomsis_stage=1');
      expect(isSignedOutFromServerTiming('acomsis_stage')).to.be.false;
    });

    it('does not confuse production and stage sign-in cookies', () => {
      cookie.get(() => 'acomsis=1');
      expect(isSignedOutFromServerTiming('acomsis_stage')).to.be.true;
      cookie.get(() => 'acomsis_stage=1');
      expect(isSignedOutFromServerTiming('acomsis')).to.be.true;
    });

    it('does not trust a positive header from a different IMS environment', () => {
      cookie.get(() => 'acomsis=1');
      navigation.returns([{ serverTiming: [{ name: 'sis', description: '1' }] }]);
      expect(isSignedOutFromServerTiming('acomsis_stage')).to.be.false;
    });

    it('requires IMS when the navigation timing API is unavailable', () => {
      navigation.value(undefined);
      expect(isSignedOutFromServerTiming('acomsis')).to.be.false;
    });
  });

  it('Does not support milolibs query param on prod', () => {
    const location = {
      hostname: 'business.adobe.com',
      search: '?milolibs=foo',
    };
    const libs = setLibs('/libs', location);
    expect(libs).to.equal('/libs');
  });

  it('Supports milolibs query param', () => {
    const location = {
      hostname: 'localhost',
      search: '?milolibs=foo',
    };
    const libs = setLibs('/libs', location);
    expect(libs).to.equal('https://foo--milo--adobecom.aem.live/libs');
  });

  it('Supports local milolibs query param', () => {
    const location = {
      hostname: 'localhost',
      search: '?milolibs=local',
    };
    const libs = setLibs('/libs', location);
    expect(libs).to.equal('http://localhost:6456/libs');
  });

  it('Supports forked milolibs query param', () => {
    const location = {
      hostname: 'localhost',
      search: '?milolibs=awesome--milo--forkedowner',
    };
    const libs = setLibs('/libs', location);
    expect(libs).to.equal('https://awesome--milo--forkedowner.aem.live/libs');
  });
});
