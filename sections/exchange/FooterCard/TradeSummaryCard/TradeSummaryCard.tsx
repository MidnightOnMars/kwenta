import { FC } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import styled, { css } from 'styled-components';
import Tippy from '@tippyjs/react';
import { customGasPriceState, gasSpeedState } from 'store/wallet';
import { useRecoilState } from 'recoil';

import { Synth } from 'lib/synthetix';

import { GasPrices, GAS_SPEEDS } from 'queries/network/useGasStationQuery';

import { NO_VALUE, ESTIMATE_VALUE } from 'constants/placeholder';
import { CurrencyKey } from 'constants/currency';

import { secondsToTime } from 'utils/formatters/date';

import Button from 'components/Button';
import { DesktopOnlyView, MobileOrTabletView } from 'components/Media';
import NumericInput from 'components/Input/NumericInput';
import Card from 'components/Card';

import { formatCurrency, formatPercent } from 'utils/formatters/number';

import { NoTextTransform, numericValueCSS, NumericValue } from 'styles/common';
import media from 'styles/media';

import { MessageContainer } from '../common';

type TradeSummaryCardProps = {
	selectedPriceCurrency: Synth;
	isSubmissionDisabled: boolean;
	isSubmitting: boolean;
	baseCurrencyAmount: string;
	onSubmit: () => void;
	totalTradePrice: number;
	basePriceRate: number;
	baseCurrency: Synth | null;
	insufficientBalance: boolean;
	selectedBothSides: boolean;
	isBaseCurrencyFrozen: boolean;
	isQuoteCurrencySuspended?: boolean;
	isBaseCurrencySuspended?: boolean;
	gasPrices: GasPrices | undefined;
	feeReclaimPeriodInSeconds: number;
	quoteCurrencyKey: CurrencyKey | null;
	showFee?: boolean;
	attached?: boolean;
	className?: string;
	exchangeFeeRate: number | null;
};

const TradeSummaryCard: FC<TradeSummaryCardProps> = ({
	selectedPriceCurrency,
	isSubmissionDisabled,
	isSubmitting,
	baseCurrencyAmount,
	onSubmit,
	totalTradePrice,
	basePriceRate,
	baseCurrency,
	insufficientBalance,
	selectedBothSides,
	isBaseCurrencyFrozen,
	isQuoteCurrencySuspended,
	isBaseCurrencySuspended,
	gasPrices,
	feeReclaimPeriodInSeconds,
	quoteCurrencyKey,
	showFee = true,
	attached,
	exchangeFeeRate,
	...rest
}) => {
	const { t } = useTranslation();
	const [gasSpeed, setGasSpeed] = useRecoilState(gasSpeedState);
	const [customGasPrice, setCustomGasPrice] = useRecoilState(customGasPriceState);

	const hasCustomGasPrice = customGasPrice !== '';
	const gasPrice = gasPrices ? gasPrices[gasSpeed] : null;

	function getButtonLabel() {
		if (isSubmissionDisabled) {
			// figure out the reason
			if (feeReclaimPeriodInSeconds) {
				return t('exchange.summary-info.button.fee-reclaim-period');
			}
			if (isQuoteCurrencySuspended || isBaseCurrencySuspended || isBaseCurrencyFrozen) {
				return t('exchange.summary-info.button.market-closed');
			}
			if (!selectedBothSides) {
				return t('exchange.summary-info.button.select-synth');
			}
			if (insufficientBalance) {
				return t('exchange.summary-info.button.insufficient-balance');
			}
			if (isSubmitting) {
				return t('exchange.summary-info.button.submitting-order');
			}
			return t('exchange.summary-info.button.enter-amount');
		}
		return t('exchange.summary-info.button.submit-order');
	}

	const summaryItems = (
		<SummaryItems attached={attached}>
			<SummaryItem>
				<SummaryItemLabel>{t('exchange.summary-info.gas-price-gwei')}</SummaryItemLabel>
				<SummaryItemValue>
					{gasPrice != null ? (
						<>
							{hasCustomGasPrice ? Number(customGasPrice) : `${ESTIMATE_VALUE} ${gasPrice}`}
							<GasPriceTooltip
								trigger="click"
								arrow={false}
								content={
									<GasSelectContainer>
										<CustomGasPriceContainer>
											<CustomGasPrice
												value={customGasPrice}
												onChange={(_, value) => setCustomGasPrice(value)}
												placeholder={t('common.custom')}
											/>
										</CustomGasPriceContainer>
										{GAS_SPEEDS.map((speed) => (
											<StyedGasButton
												key={speed}
												variant="select"
												onClick={() => {
													setCustomGasPrice('');
													setGasSpeed(speed);
												}}
												isActive={hasCustomGasPrice ? false : gasSpeed === speed}
											>
												<span>{t(`common.gas-prices.${speed}`)}</span>
												<NumericValue>{gasPrices![speed]}</NumericValue>
											</StyedGasButton>
										))}
									</GasSelectContainer>
								}
								interactive={true}
							>
								<StyledGasEditButton role="button">{t('common.edit')}</StyledGasEditButton>
							</GasPriceTooltip>
						</>
					) : (
						NO_VALUE
					)}
				</SummaryItemValue>
			</SummaryItem>
			<SummaryItem>
				<SummaryItemLabel>
					<Trans
						i18nKey="common.currency.currency-value"
						values={{ currencyKey: selectedPriceCurrency.asset }}
						components={[<NoTextTransform />]}
					/>
				</SummaryItemLabel>
				<SummaryItemValue>
					{baseCurrencyAmount
						? formatCurrency(selectedPriceCurrency.name, totalTradePrice, {
								sign: selectedPriceCurrency.sign,
						  })
						: NO_VALUE}
				</SummaryItemValue>
			</SummaryItem>
			{showFee && (
				<>
					<SummaryItem>
						<SummaryItemLabel>{t('exchange.summary-info.fee')}</SummaryItemLabel>
						<SummaryItemValue>
							{exchangeFeeRate != null ? formatPercent(exchangeFeeRate) : NO_VALUE}
						</SummaryItemValue>
					</SummaryItem>
					<SummaryItem>
						<SummaryItemLabel>{t('exchange.summary-info.fee-cost')}</SummaryItemLabel>
						<SummaryItemValue>
							{exchangeFeeRate != null && baseCurrencyAmount
								? formatCurrency(
										selectedPriceCurrency.name,
										Number(baseCurrencyAmount) * exchangeFeeRate * basePriceRate,
										{ sign: selectedPriceCurrency.sign }
								  )
								: NO_VALUE}
						</SummaryItemValue>
					</SummaryItem>
				</>
			)}
		</SummaryItems>
	);

	return (
		<>
			<MobileOrTabletView>
				<MobileCard>
					<Card.Body>{summaryItems}</Card.Body>
				</MobileCard>
			</MobileOrTabletView>
			<MessageContainer attached={attached} {...rest}>
				<DesktopOnlyView>{summaryItems}</DesktopOnlyView>
				<ErrorTooltip
					visible={feeReclaimPeriodInSeconds > 0}
					placement="top"
					content={
						<div>
							{t('exchange.errors.fee-reclamation', {
								waitingPeriod: secondsToTime(feeReclaimPeriodInSeconds),
								currencyKey: quoteCurrencyKey,
							})}
						</div>
					}
				>
					<span>
						<Button
							variant="primary"
							isRounded={true}
							disabled={isSubmissionDisabled}
							onClick={onSubmit}
							size="lg"
						>
							{getButtonLabel()}
						</Button>
					</span>
				</ErrorTooltip>
			</MessageContainer>
		</>
	);
};

const SummaryItems = styled.div<{ attached?: boolean }>`
	display: grid;
	grid-auto-flow: column;
	flex-grow: 1;
	${media.lessThan('md')`
		grid-auto-flow: unset;
		grid-template-columns: auto auto;
		grid-template-rows: auto auto;
		grid-gap: 20px;
	`}

	${(props) =>
		props.attached &&
		css`
			& {
				grid-template-rows: unset;
			}
		`}
`;

const SummaryItem = styled.div`
	display: grid;
	grid-gap: 4px;
	width: 110px;
	${media.lessThan('md')`
		width: unset;
	`}
`;

const SummaryItemLabel = styled.div`
	text-transform: capitalize;
`;

const SummaryItemValue = styled.div`
	color: ${(props) => props.theme.colors.white};
	${numericValueCSS};
	max-width: 100px;
	overflow: hidden;
	text-overflow: ellipsis;
`;

const GasPriceTooltip = styled(Tippy)`
	background: ${(props) => props.theme.colors.elderberry};
	border: 0.5px solid ${(props) => props.theme.colors.navy};
	border-radius: 4px;
	width: 120px;
	.tippy-content {
		padding: 0;
	}
`;

const GasSelectContainer = styled.div`
	padding: 16px 0 8px 0;
`;

const CustomGasPriceContainer = styled.div`
	margin: 0 10px 5px 10px;
`;

const CustomGasPrice = styled(NumericInput)`
	width: 100%;
	border: 0;
	font-size: 12px;
	::placeholder {
		font-family: ${(props) => props.theme.fonts.mono};
	}
`;

const StyedGasButton = styled(Button)`
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-left: 10px;
	padding-right: 10px;
`;

const StyledGasEditButton = styled.span`
	font-family: ${(props) => props.theme.fonts.bold};
	padding-left: 5px;
	cursor: pointer;
	color: ${(props) => props.theme.colors.goldColors.color3};
	text-transform: uppercase;
`;

const ErrorTooltip = styled(Tippy)`
	font-size: 12px;
	background-color: ${(props) => props.theme.colors.red};
	color: ${(props) => props.theme.colors.white};
	.tippy-arrow {
		color: ${(props) => props.theme.colors.red};
	}
`;

const MobileCard = styled(Card)`
	margin: 0 auto 86px auto;
`;

export default TradeSummaryCard;
