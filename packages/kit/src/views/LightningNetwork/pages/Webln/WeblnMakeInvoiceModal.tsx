import { useCallback, useState } from 'react';

import BigNumber from 'bignumber.js';
import { useIntl } from 'react-intl';

import { Page, Toast, useForm } from '@onekeyhq/components';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import useDappApproveAction from '@onekeyhq/kit/src/hooks/useDappApproveAction';
import useDappQuery from '@onekeyhq/kit/src/hooks/useDappQuery';
import DappOpenModalPage from '@onekeyhq/kit/src/views/DAppConnection/pages/DappOpenModalPage';
import { OneKeyError } from '@onekeyhq/shared/src/errors';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import { EDAppModalPageStatus } from '@onekeyhq/shared/types/dappConnection';
import type { IRequestInvoiceArgs } from '@onekeyhq/shared/types/lightning/webln';

import { DAppAccountListStandAloneItem } from '../../../DAppConnection/components/DAppAccountList';
import {
  DAppRequestFooter,
  DAppRequestLayout,
} from '../../../DAppConnection/components/DAppRequestLayout';
import { useRiskDetection } from '../../../DAppConnection/hooks/useRiskDetection';
import LNMakeInvoiceForm from '../../components/LNMakeInvoiceForm';

import type { IMakeInvoiceFormValues } from '../../components/LNMakeInvoiceForm';

type ISourceParams = IRequestInvoiceArgs & {
  accountId: string;
  networkId: string;
};

function WeblnMakeInvoiceModal() {
  const intl = useIntl();
  const { $sourceInfo, accountId, networkId } = useDappQuery<ISourceParams>();
  const dappApprove = useDappApproveAction({
    id: $sourceInfo?.id ?? '',
    closeWindowAfterResolved: true,
  });

  const [isLoading, setIsLoading] = useState(false);

  const makeInvoiceParams = $sourceInfo?.data.params as IRequestInvoiceArgs;

  const {
    showContinueOperate,
    continueOperate,
    setContinueOperate,
    riskLevel,
    urlSecurityInfo,
  } = useRiskDetection({ origin: $sourceInfo?.origin ?? '' });

  const useFormReturn = useForm<IMakeInvoiceFormValues>({
    defaultValues: {
      amount: `${
        makeInvoiceParams.amount ?? makeInvoiceParams.defaultAmount ?? ''
      }`,
      description: makeInvoiceParams.defaultMemo ?? '',
    },
  });

  const onConfirm = useCallback(
    async (close?: (extra?: { flag?: string }) => void) => {
      if (isLoading) return;
      const isValid = await useFormReturn.trigger();
      if (!isValid) {
        return;
      }

      if (!networkId || !accountId) return;
      setIsLoading(true);
      const values = useFormReturn.getValues();
      const amount = values.amount || '0';
      try {
        const invoice = await backgroundApiProxy.serviceLightning.createInvoice(
          {
            networkId,
            accountId,
            amount,
            description: values.description,
          },
        );
        Toast.success({
          title: 'Invoice created',
        });
        await dappApprove.resolve({
          close: () => {
            close?.({ flag: EDAppModalPageStatus.Confirmed });
          },
          result: {
            paymentRequest: invoice.payment_request,
            paymentHash: invoice.payment_hash,
          },
        });
      } catch (e: any) {
        dappApprove.reject();
        const message = (e as Error)?.message ?? e;
        throw new OneKeyError({
          message,
          autoToast: true,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [networkId, accountId, isLoading, dappApprove, useFormReturn],
  );

  return (
    <DappOpenModalPage dappApprove={dappApprove}>
      <>
        <Page.Header headerShown={false} />
        <Page.Body>
          <DAppRequestLayout
            title={intl.formatMessage({
              id: ETranslations.dapp_connect_create_invoice_request,
            })}
            subtitleShown={false}
            origin={$sourceInfo?.origin ?? ''}
            urlSecurityInfo={urlSecurityInfo}
          >
            <DAppAccountListStandAloneItem readonly />
            <LNMakeInvoiceForm
              isWebln
              accountId={accountId}
              networkId={networkId}
              useFormReturn={useFormReturn}
              amount={new BigNumber(makeInvoiceParams.amount ?? '').toNumber()}
              minimumAmount={new BigNumber(
                makeInvoiceParams.minimumAmount ?? '',
              ).toNumber()}
              maximumAmount={new BigNumber(
                makeInvoiceParams.maximumAmount ?? '',
              ).toNumber()}
              amountReadOnly={Number(makeInvoiceParams.amount) > 0}
              memo={makeInvoiceParams.defaultMemo}
            />
          </DAppRequestLayout>
        </Page.Body>
        <Page.Footer>
          <DAppRequestFooter
            confirmText={intl.formatMessage({
              id: ETranslations.dapp_connect_create,
            })}
            continueOperate={continueOperate}
            setContinueOperate={(checked) => {
              setContinueOperate(!!checked);
            }}
            onConfirm={onConfirm}
            onCancel={() => dappApprove.reject()}
            confirmButtonProps={{
              loading: isLoading,
              disabled: !continueOperate,
            }}
            showContinueOperateCheckbox={showContinueOperate}
            riskLevel={riskLevel}
          />
        </Page.Footer>
      </>
    </DappOpenModalPage>
  );
}

export default WeblnMakeInvoiceModal;
