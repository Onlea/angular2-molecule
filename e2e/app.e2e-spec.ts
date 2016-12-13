import { Ng2MoleculePage } from './app.po';

describe('ng2-molecule App', function() {
  let page: Ng2MoleculePage;

  beforeEach(() => {
    page = new Ng2MoleculePage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
