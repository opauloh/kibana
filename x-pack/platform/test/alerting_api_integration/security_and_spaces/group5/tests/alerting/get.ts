/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Agent as SuperTestAgent } from 'supertest';
import type { SupertestWithoutAuthProviderType } from '@kbn/ftr-common-functional-services';
import { SuperuserAtSpace1, UserAtSpaceScenarios } from '../../../scenarios';
import {
  getUrlPrefix,
  getTestRuleData,
  ObjectRemover,
  getUnauthorizedErrorMessage,
} from '../../../../common/lib';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

const getTestUtils = (
  describeType: 'internal' | 'public',
  objectRemover: ObjectRemover,
  supertest: SuperTestAgent,
  supertestWithoutAuth: SupertestWithoutAuthProviderType
) => {
  describe(describeType, () => {
    afterEach(() => objectRemover.removeAll());
    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should handle get alert request appropriately', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getTestRuleData())
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          const response = await supertestWithoutAuth
            .get(
              `${getUrlPrefix(space.id)}/${
                describeType === 'public' ? 'api' : 'internal'
              }/alerting/rule/${createdAlert.id}`
            )
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage('get', 'test.noop', 'alertsFixture'),
                statusCode: 403,
              });
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body).to.eql({
                id: createdAlert.id,
                name: 'abc',
                tags: ['foo'],
                rule_type_id: 'test.noop',
                running: false,
                consumer: 'alertsFixture',
                schedule: { interval: '1m' },
                enabled: true,
                actions: [],
                params: {},
                created_by: 'elastic',
                scheduled_task_id: response.body.scheduled_task_id,
                updated_at: response.body.updated_at,
                created_at: response.body.created_at,
                throttle: '1m',
                notify_when: 'onThrottleInterval',
                updated_by: 'elastic',
                api_key_owner: 'elastic',
                ...(describeType === 'internal'
                  ? {
                      artifacts: {
                        dashboards: [],
                        investigation_guide: { blob: '' },
                      },
                    }
                  : {}),
                api_key_created_by_user: false,
                mute_all: false,
                muted_alert_ids: [],
                execution_status: response.body.execution_status,
                revision: 0,
                ...(response.body.next_run ? { next_run: response.body.next_run } : {}),
                ...(response.body.last_run ? { last_run: response.body.last_run } : {}),
                ...(describeType === 'internal'
                  ? {
                      monitoring: response.body.monitoring,
                      snooze_schedule: response.body.snooze_schedule,
                      is_snoozed_until: response.body.is_snoozed_until,
                    }
                  : {}),
              });
              expect(Date.parse(response.body.created_at)).to.be.greaterThan(0);
              expect(Date.parse(response.body.updated_at)).to.be.greaterThan(0);
              if (response.body.next_run) {
                expect(Date.parse(response.body.next_run)).to.be.greaterThan(0);
              }
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle get alert request appropriately when consumer is the same as producer', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.restricted-noop',
                consumer: 'alertsRestrictedFixture',
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          const response = await supertestWithoutAuth
            .get(
              `${getUrlPrefix(space.id)}/${
                describeType === 'public' ? 'api' : 'internal'
              }/alerting/rule/${createdAlert.id}`
            )
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage(
                  'get',
                  'test.restricted-noop',
                  'alertsRestrictedFixture'
                ),
                statusCode: 403,
              });
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(200);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle get alert request appropriately when consumer is not the producer', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.unrestricted-noop',
                consumer: 'alertsFixture',
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          const response = await supertestWithoutAuth
            .get(
              `${getUrlPrefix(space.id)}/${
                describeType === 'public' ? 'api' : 'internal'
              }/alerting/rule/${createdAlert.id}`
            )
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage(
                  'get',
                  'test.unrestricted-noop',
                  'alertsFixture'
                ),
                statusCode: 403,
              });
              break;
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'superuser at space1':
            case 'global_read at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(200);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle get alert request appropriately when consumer is "alerts"', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.restricted-noop',
                consumer: 'alerts',
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          const response = await supertestWithoutAuth
            .get(
              `${getUrlPrefix(space.id)}/${
                describeType === 'public' ? 'api' : 'internal'
              }/alerting/rule/${createdAlert.id}`
            )
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage('get', 'test.restricted-noop', 'alerts'),
                statusCode: 403,
              });
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(200);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`shouldn't get alert from another space`, async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getTestRuleData())
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          const response = await supertestWithoutAuth
            .get(
              `${getUrlPrefix('other')}/${
                describeType === 'public' ? 'api' : 'internal'
              }/alerting/rule/${createdAlert.id}`
            )
            .auth(user.username, user.password);

          expect(response.statusCode).to.eql(404);
          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'global_read at space1':
            case 'superuser at space1':
              expect(response.body).to.eql({
                statusCode: 404,
                error: 'Not Found',
                message: `Saved object [alert/${createdAlert.id}] not found`,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`should handle get alert request appropriately when alert doesn't exist`, async () => {
          const response = await supertestWithoutAuth
            .get(`${getUrlPrefix(space.id)}/api/alerting/rule/1`)
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(404);
              expect(response.body).to.eql({
                statusCode: 404,
                error: 'Not Found',
                message: 'Saved object [alert/1] not found',
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }
  });

  describe('Actions', () => {
    const { user, space } = SuperuserAtSpace1;

    it('should return the actions correctly', async () => {
      const { body: createdAction } = await supertest
        .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'MY action',
          connector_type_id: 'test.noop',
          config: {},
          secrets: {},
        })
        .expect(200);

      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            enabled: true,
            actions: [
              {
                id: createdAction.id,
                group: 'default',
                params: {},
              },
              {
                id: 'system-connector-test.system-action',
                params: {},
              },
            ],
          })
        )
        .expect(200);

      objectRemover.add(space.id, createdRule.id, 'rule', 'alerting');

      const response = await supertestWithoutAuth
        .get(`${getUrlPrefix(space.id)}/api/alerting/rule/${createdRule.id}`)
        .set('kbn-xsrf', 'foo')
        .auth(user.username, user.password);

      const action = response.body.actions[0];
      const systemAction = response.body.actions[1];
      const { uuid, ...restAction } = action;
      const { uuid: systemActionUuid, ...restSystemAction } = systemAction;

      expect([restAction, restSystemAction]).to.eql([
        {
          id: createdAction.id,
          connector_type_id: 'test.noop',
          group: 'default',
          params: {},
        },
        {
          id: 'system-connector-test.system-action',
          connector_type_id: 'test.system-action',
          params: {},
        },
        ,
      ]);
    });
  });

  describe('Artifacts', () => {
    it('should return the artifacts correctly', async () => {
      const { user, space } = SuperuserAtSpace1;

      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            enabled: true,
            ...(describeType === 'internal'
              ? {
                  artifacts: {
                    dashboards: [
                      {
                        id: 'dashboard-1',
                      },
                      {
                        id: 'dashboard-2',
                      },
                    ],
                    investigation_guide: { blob: '# Summary' },
                  },
                }
              : {}),
          })
        )
        .expect(200);

      objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

      const response = await supertestWithoutAuth
        .get(
          `${getUrlPrefix(space.id)}/${
            describeType === 'public' ? 'api' : 'internal'
          }/alerting/rule/${createdAlert.id}`
        )
        .auth(user.username, user.password);

      if (describeType === 'public') {
        expect(response.body.artifacts).to.be(undefined);
      } else if (describeType === 'internal') {
        expect(response.body.artifacts).to.eql({
          dashboards: [
            {
              id: 'dashboard-1',
            },
            {
              id: 'dashboard-2',
            },
          ],
          investigation_guide: { blob: '# Summary' },
        });
      }
    });
  });
};

export default function createGetTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('get', () => {
    const objectRemover = new ObjectRemover(supertest);
    afterEach(() => objectRemover.removeAll());

    getTestUtils('public', objectRemover, supertest, supertestWithoutAuth);
    getTestUtils('internal', objectRemover, supertest, supertestWithoutAuth);
  });
}
