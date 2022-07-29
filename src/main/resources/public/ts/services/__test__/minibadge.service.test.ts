import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import {minibadgeService} from '../minibadge.service';

describe('MinibadgeService', () => {
    it('returns data when retrieve request is correctly called', done => {
        const mock = new MockAdapter(axios);
        const data = {response: true};
        mock.onGet(`/minibadge/test/ok`).reply(200, data);
        minibadgeService.test().then(response => {
            expect(response.data).toEqual(data);
            done();
        });
    });
});
