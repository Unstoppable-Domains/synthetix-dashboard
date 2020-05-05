import React from 'react';
import { connect } from 'react-redux';
import { fetchCharts, setPeriod } from '../../actions/charts';
import { fetchHAV, fetchNUSD } from '../../actions/markets';
import { fetchOpenInterest, fetchTradingVolume, fetchUniswapData } from '../../actions/exchange';
import { fetchNetworkData, fetchNetworkFees } from '../../actions/network';
import Chart from '../../components/Chart';
import PieChart from '../../components/PieChart';
import HorizontalBarChart from '../../components/HorizontalBarChart';
import TopNavBar from '../../components/TopNavBar';
import SingleStatBox from '../../components/SingleStatBox';
import SingleStat from '../../components/SingleStat';
import { switchTheme } from '../../actions/theme';
import { CHARTS, toPercent, isEmptyObj } from '../../utils';
import cx from 'classnames';
import numeral from 'numeral';
import { scroller } from 'react-scroll';

import { Link } from 'react-router-dom';

const HAV_CHART = {
	HavvenPrice: 'HavvenPrice',
	HavvenVolume24h: 'HavvenVolume24h',
};
const nUSD_CHART = {
	NominPrice: 'NominPrice',
	NominVolume24h: 'NominVolume24h',
};
const DECIMALS = {
	HavvenPrice: { Val: 3, Eth: 7 },
	HavvenVolume24h: { Val: 0, Eth: 0 },
	NominPrice: { Val: 3 },
	NominVolume24h: { Val: 2 },
};

class App extends React.Component {
	constructor(props) {
		super(props);
	}

	state = {
		activeSection: 'stats',
		havButtons: { Usd: true, Eth: true },
		havChartName: HAV_CHART.HavvenPrice,
		nUSDChartName: nUSD_CHART.NominPrice,
	};

	componentDidMount() {
		const {
			snxjs,
			fetchHAV,
			fetchNUSD,
			fetchCharts,
			fetchOpenInterest,
			fetchTradingVolume,
			fetchUniswapData,
			fetchNetworkData,
			fetchNetworkFees,
			charts,
		} = this.props;

		fetchHAV();
		fetchNUSD();
		fetchOpenInterest();
		fetchTradingVolume();

		fetchUniswapData(snxjs);
		fetchNetworkData(snxjs);
		fetchNetworkFees(snxjs);
		if (isEmptyObj(charts.stats)) {
			fetchCharts(CHARTS.DAY);
			fetchCharts(CHARTS.MONTH);
		}
		this.setState({
			intervalId: setInterval(() => fetchCharts(CHARTS.MONTH), 10 * 60 * 1000),
			sethProxyAddress: snxjs.sETH.contract.address,
		});
	}

	onCurrencyClick = val => {
		const havButtons = { ...this.state.havButtons };
		havButtons[val] = !havButtons[val];
		this.setState({
			havButtons,
		});
	};

	setHavChart = chartName => {
		this.setState({ havChartName: chartName });
	};

	setnUSDChart = chartName => {
		this.setState({ nUSDChartName: chartName });
	};

	setPeriod = (val, token) => {
		this.props.setPeriod(val, token);
	};

	componentWillUnmount() {
		clearInterval(this.state.intervalId);
	}

	getMarketsData() {
		const { markets } = this.props;
		const data = { snxMarketData: {}, susdMarketData: {} };
		['snx', 'susd'].forEach(currency => {
			if (markets[currency] && markets[currency].quote && markets[currency].quote.USD) {
				data[`${currency}MarketData`] = { ...markets[currency].quote.USD };
			}
		});
		return data;
	}

	render() {
		const { charts, theme, exchange, network } = this.props;
		const { havPeriod, nUSDPeriod } = charts;
		const { activeSection, havButtons, havChartName, nUSDChartName, sethProxyAddress } = this.state;
		const { stats, lastUpdated } = charts;
		const { HavvenVolume24h, HavvenPrice } = HAV_CHART;
		const { NominVolume24h, NominPrice } = nUSD_CHART;

		const { snxMarketData, susdMarketData } = this.getMarketsData();
		const scrollToOptions = {
			duration: 500,
			delay: 100,
			smooth: 'easeInOutQuint',
			offset: -110,
		};

		const formattedDistribution = [];
		let totalDistribution = 0;

		if (exchange.distribution) {
			totalDistribution = exchange.distribution.reduce((acc, val) => acc + val.value, 0);
			let cumulativeDistributionValue = 0;
			let otherDistributionValue = 0;
			let hasReached = false;
			exchange.distribution
				.sort((a, b) => b.value - a.value)
				.forEach(synth => {
					if (!hasReached && cumulativeDistributionValue / totalDistribution < 0.9) {
						formattedDistribution.push(synth);
						cumulativeDistributionValue += synth.value;
					} else {
						hasReached = true;
						otherDistributionValue += synth.value;
					}
				});
			formattedDistribution.push({
				name: 'Others',
				value: otherDistributionValue,
			});
		}

		const havStats = {
			[HAV_CHART.HavvenPrice]: {
				value: snxMarketData.price,
				trend: snxMarketData.percent_change_24h / 100,
				decimals: 3,
			},
			[HAV_CHART.HavvenVolume24h]: {
				value: snxMarketData.volume_24h,
				trend: stats.havvenVolume24hDelta,
				decimals: 0,
			},
		};
		const currentHavStat = havStats[havChartName];

		const nominStats = {
			[nUSD_CHART.NominPrice]: {
				value: susdMarketData.price,
				trend: susdMarketData.percent_change_24h / 100,
				decimals: 3,
			},
			[nUSD_CHART.NominVolume24h]: {
				value: susdMarketData.volume_24h,
				trend: stats.nominVolume24hDelta,
				decimals: 0,
			},
		};
		const currentNominStat = nominStats[nUSDChartName];

		const sETHPrice = exchange.rate ? exchange.rate : null;
		const sETHMarketCap =
			exchange.openInterest && exchange.openInterest.find(s => s.name === 'ETH');

		const sETHPool = exchange.uniswap;
		const sETHtoETHRate = sETHPool ? parseFloat(sETHPool.eth) / parseFloat(sETHPool.synth) : null;
		return (
			<div className="dashboard-root">
				<TopNavBar selectedSection={activeSection} />
				<div className="container main-content">
					<div className="columns is-multiline" id="stats">
						<Link
							to="/buy-snx"
							className="column is-half-tablet is-one-quarter-desktop markets-link"
						>
							<SingleStatBox
								value={snxMarketData ? snxMarketData.market_cap : null}
								trend={stats.havvenPrice24hDelta * 100}
								label="SNX MARKET CAP"
								desc="The total value of all circulating SNX."
								decimals={0}
								isClickable={true}
							/>
						</Link>
						<Link
							to="/buy-snx"
							className="column is-half-tablet is-one-quarter-desktop markets-link"
						>
							<SingleStatBox
								value={snxMarketData ? snxMarketData.price : null}
								trend={snxMarketData ? snxMarketData.percent_change_24h : null}
								label="SNX PRICE"
								desc="The average price of SNX across exchanges."
								decimals={3}
								onClick={() => {
									this.setHavChart(HavvenPrice);
									scroller.scrollTo('hav-main-chart', scrollToOptions);
								}}
								isClickable={true}
							/>
						</Link>
						<Link
							to="/buy-susd"
							className="column is-half-tablet is-one-quarter-desktop markets-link"
						>
							<SingleStatBox
								value={susdMarketData ? susdMarketData.market_cap : null}
								trend={stats.nominPrice24hDelta * 100}
								label="sUSD MARKET CAP"
								desc="The total value of all circulating sUSD."
								decimals={0}
								isClickable={true}
							/>
						</Link>
						<Link
							to="/buy-susd"
							className="column is-half-tablet is-one-quarter-desktop markets-link"
						>
							<SingleStatBox
								value={susdMarketData ? susdMarketData.price : null}
								trend={susdMarketData ? susdMarketData.percent_change_24h : null}
								label="sUSD PRICE"
								desc="The average price of sUSD across exchanges."
								decimals={3}
								onClick={() => {
									this.setnUSDChart(NominPrice);
									scroller.scrollTo('nomin-main-chart', scrollToOptions);
								}}
								isClickable={true}
							/>
						</Link>
						<div className="column is-half-tablet is-one-quarter-desktop markets-link">
							<SingleStatBox
								value={sETHMarketCap ? sETHMarketCap.longs : null}
								label="sETH MARKET CAP"
								desc="The total value of all circulating sETH."
								onClick={() => {}}
								decimals={0}
							/>
						</div>
						<div className="column is-half-tablet is-one-quarter-desktop markets-link">
							<SingleStatBox
								value={sETHPrice ? sETHPrice : null}
								label="sETH PRICE"
								desc="The average price of sETH across exchanges."
								onClick={() => {}}
								decimals={3}
							/>
						</div>
						<div className="column is-half-tablet is-one-quarter-desktop markets-link">
							<SingleStatBox
								value={sETHtoETHRate ? sETHtoETHRate : null}
								label="sETH UNISWAP RATE"
								desc={
									'Pool size: ' +
									(sETHPool
										? `${parseFloat(sETHPool.synth).toFixed(2)} sETH / ${parseFloat(
												sETHPool.eth
										  ).toFixed(2)} ETH`
										: '')
								}
								type="number"
								onClick={() => {
									window.open(`https://uniswap.exchange/swap/${sethProxyAddress}`, '__blank');
								}}
								decimals={3}
							/>
						</div>
						<div className="column is-half-tablet is-one-quarter-desktop markets-link">
							<SingleStatBox
								value={totalDistribution ? totalDistribution : null}
								label="TOTAL SYNTH SUPPLY"
								desc="The total value of all circulating synths."
								onClick={() => {}}
								decimals={0}
							/>
						</div>
						<div className="column is-half-tablet is-one-quarter-desktop markets-link">
							<SingleStatBox
								value={
									network.totalIssuedSynths && snxMarketData && snxMarketData.market_cap > 0
										? Number((snxMarketData.market_cap / network.totalIssuedSynths) * 100).toFixed(
												2
										  )
										: null
								}
								type="percentage"
								label="NETWORK COLLATERALIZATION RATIO"
								desc="The aggregate collateralisation ratio of all SNX wallets."
								onClick={() => {}}
								decimals={2}
							/>
						</div>
						<div className="column is-half-tablet is-one-quarter-desktop markets-link">
							<SingleStatBox
								value={
									network.activeCollateralizationRatio
										? toPercent(network.activeCollateralizationRatio)
										: null
								}
								type="percentage"
								label="ACTIVE COLLATERALIZATION RATIO"
								desc="The aggregate collateralisation ratio of SNX wallets that are currently staking."
								onClick={() => {}}
								decimals={2}
							/>
						</div>
						<div className="column is-half-tablet is-one-quarter-desktop markets-link">
							<SingleStatBox
								value={
									network.percentLocked && snxMarketData && snxMarketData.market_cap > 0
										? toPercent((network.percentLocked / 100) * snxMarketData.market_cap)
										: null
								}
								label="LOCKED SNX VALUE"
								desc="The total value of all staked SNX."
								onClick={() => {}}
								decimals={0}
							/>
						</div>
						<div className="column is-half-tablet is-one-quarter-desktop markets-link">
							<SingleStatBox
								value={network.percentLocked ? toPercent(network.percentLocked) : null}
								type="percentage"
								label="LOCKED SNX RATIO"
								desc="The percentage of SNX tokens that are staked."
								onClick={() => {}}
								decimals={2}
							/>
						</div>
						<div className="column is-half-tablet is-one-quarter-desktop markets-link">
							<SingleStatBox
								value={
									exchange.volume && exchange.volume.last24Hours > 0
										? exchange.volume.last24Hours
										: null
								}
								label="SYNTHETIX.EXCHANGE VOLUME"
								desc="Synthetix.Exchange 24h trading volume."
								onClick={() => {}}
								decimals={0}
							/>
						</div>
						<div className="column is-half-tablet is-one-quarter-desktop markets-link">
							<SingleStatBox
								value={exchange.volume && exchange.volume.total > 0 ? exchange.volume.total : null}
								label="SYNTHETIX.EXCHANGE TOTAL VOL."
								desc="Synthetix.Exchange all time volume."
								onClick={() => {}}
								decimals={0}
							/>
						</div>
						<div className="column is-half-tablet is-one-quarter-desktop markets-link">
							<SingleStatBox
								value={
									network.totalFeesAvailable && network.totalFeesAvailable > 0
										? network.totalFeesAvailable
										: null
								}
								label="CURRENT FEE POOL"
								desc="Fees currently claimable in the pool."
								onClick={() => {}}
								decimals={2}
							/>
						</div>
						<div className="column is-half-tablet is-one-quarter-desktop markets-link">
							<SingleStatBox
								value={exchange.totalFeesGenerated > 0 ? exchange.totalFeesGenerated : null}
								label="TOTAL FEES GENERATED"
								desc="Fees generated since launch (Dec 2018)."
								onClick={() => {}}
								decimals={2}
							/>
						</div>
					</div>
				</div>
				<div className="container chart-section" id="hav">
					<div>
						<div className="level is-mobile chart-section__heading">
							<div className="level-left is-hidden-mobile">
								<div className="level-item title">
									<h2>SNX</h2>
									<span>(SYNTHETIX)</span>
								</div>
							</div>
							<div className="level-right">
								<div className="level-item">
									<button
										className={cx('button', 'is-link', {
											'is-active': havChartName === HavvenPrice,
										})}
										onClick={() => {
											this.setHavChart(HavvenPrice);
										}}
									>
										Price
									</button>
								</div>
								<div className="level-item">
									<button
										className={cx('button', 'is-link', {
											'is-active': havChartName === HavvenVolume24h,
										})}
										onClick={() => {
											this.setHavChart(HavvenVolume24h);
										}}
									>
										Volume
									</button>
								</div>
							</div>
						</div>
						<div className="columns">
							<div className="column">
								<div className="chart-box chart-box--main" id="hav-main-chart">
									<SingleStat {...currentHavStat} />
									<div className="time-toggles is-hidden-mobile">
										<button
											onClick={() => this.setPeriod(CHARTS.DAY, 'HAV')}
											className={cx({
												'is-active': havPeriod === CHARTS.DAY,
											})}
										>
											1D
										</button>
										{charts.periodLoaded === CHARTS.MONTH ? (
											<>
												<button
													onClick={() => this.setPeriod(CHARTS.WEEK, 'HAV')}
													className={cx({
														'is-active': havPeriod === CHARTS.WEEK,
													})}
												>
													1W
												</button>
												<button
													onClick={() => this.setPeriod(CHARTS.MONTH, 'HAV')}
													className={cx({
														'is-active': havPeriod === CHARTS.MONTH,
													})}
												>
													1M
												</button>
											</>
										) : null}
									</div>
									<div>
										<Chart
											isLightMode={theme === 'light'}
											period={havPeriod}
											info={charts[havChartName]}
											decimals={DECIMALS[havChartName]}
											fullSize={true}
											colorGradient="green"
											lastUpdated={lastUpdated}
											currencySwitch={this.state.havButtons}
										/>
									</div>
								</div>
							</div>
						</div>
						<div className="time-toggles is-hidden-tablet">
							<button
								onClick={() => this.setPeriod(CHARTS.DAY, 'HAV')}
								className={cx({
									'is-active': havPeriod === CHARTS.DAY,
								})}
							>
								1D
							</button>
							{charts.periodLoaded === CHARTS.MONTH ? (
								<>
									<button
										onClick={() => this.setPeriod(CHARTS.WEEK, 'HAV')}
										className={cx({
											'is-active': havPeriod === CHARTS.WEEK,
										})}
									>
										1W
									</button>
									<button
										onClick={() => this.setPeriod(CHARTS.MONTH, 'HAV')}
										className={cx({
											'is-active': havPeriod === CHARTS.MONTH,
										})}
									>
										1M
									</button>
								</>
							) : null}
						</div>
						<div className="level is-mobile justified-content-center">
							<div className="level-left" />
							<div className="level-right currency-toggles">
								<div className="level-item">
									<button
										className={cx('button is-link usd', {
											'is-active': havButtons.Usd,
										})}
										onClick={() => this.onCurrencyClick('Usd')}
									>
										USD
									</button>
								</div>
								<div className="level-item">
									<button
										className={cx('button is-link eth', {
											'is-active': havButtons.Eth,
										})}
										onClick={() => this.onCurrencyClick('Eth')}
									>
										ETH
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div className="container chart-section" id="nusd">
					<div>
						<div className="level is-mobile chart-section__heading">
							<div className="level-left is-hidden-mobile">
								<div className="level-item title">
									<h2>sUSD</h2>
									<span>(SYNTHS)</span>
								</div>
							</div>
							<div className="level-right">
								<div className="level-item">
									<button
										className={cx('button', 'is-link', {
											'is-active': nUSDChartName === NominPrice,
										})}
										onClick={() => {
											this.setnUSDChart(NominPrice);
										}}
									>
										Price
									</button>
								</div>
								<div className="level-item">
									<button
										className={cx('button', 'is-link', {
											'is-active': nUSDChartName === NominVolume24h,
										})}
										onClick={() => {
											this.setnUSDChart(NominVolume24h);
										}}
									>
										Volume
									</button>
								</div>
							</div>
						</div>

						<div className="columns">
							<div className="column">
								<div className="chart-box chart-box--main" id="nomin-main-chart">
									<SingleStat {...currentNominStat} />
									<div className="time-toggles is-hidden-mobile">
										<button
											onClick={() => this.setPeriod(CHARTS.DAY, 'nUSD')}
											className={cx({
												'is-active': nUSDPeriod === CHARTS.DAY,
											})}
										>
											1D
										</button>
										{charts.periodLoaded === CHARTS.MONTH ? (
											<>
												<button
													onClick={() => this.setPeriod(CHARTS.WEEK, 'nUSD')}
													className={cx({
														'is-active': nUSDPeriod === CHARTS.WEEK,
													})}
												>
													1W
												</button>
												<button
													onClick={() => this.setPeriod(CHARTS.MONTH, 'nUSD')}
													className={cx({
														'is-active': nUSDPeriod === CHARTS.MONTH,
													})}
												>
													1M
												</button>
											</>
										) : null}
									</div>
									<div>
										<Chart
											isLightMode={theme === 'light'}
											period={nUSDPeriod}
											info={charts[nUSDChartName]}
											decimals={DECIMALS[nUSDChartName]}
											fullSize={true}
											colorGradient="green"
											lastUpdated={lastUpdated}
										/>
									</div>
								</div>
							</div>
						</div>
						<div className="time-toggles is-hidden-tablet">
							<button
								onClick={() => this.setPeriod(CHARTS.DAY, 'nUSD')}
								className={cx({
									'is-active': nUSDPeriod === CHARTS.DAY,
								})}
							>
								1D
							</button>
							{charts.periodLoaded === CHARTS.MONTH ? (
								<>
									<button
										onClick={() => this.setPeriod(CHARTS.WEEK, 'nUSD')}
										className={cx({
											'is-active': nUSDPeriod === CHARTS.WEEK,
										})}
									>
										1W
									</button>
									<button
										onClick={() => this.setPeriod(CHARTS.MONTH, 'nUSD')}
										className={cx({
											'is-active': nUSDPeriod === CHARTS.MONTH,
										})}
									>
										1M
									</button>
								</>
							) : null}
						</div>
						<div className="columns">
							<div className="column">
								<div style={{ height: '100%' }} className="chart-box">
									<div className="chart-box__info">
										<div className="chart-box-title">
											<h3>OPEN INTEREST</h3>
											<span className="chart-box__number" />
										</div>
										<div className="chart-box-desc">Long/short interest on cryptoassets</div>
									</div>

									{exchange.openInterest ? (
										<HorizontalBarChart
											isLightMode={theme === 'light'}
											data={exchange.openInterest.map(synth => {
												return {
													x: synth.longs,
													y: synth.total - synth.longs,
													z: synth.total,
													label: synth.name,
												};
											})}
										/>
									) : null}
								</div>
							</div>
							<div className="column">
								<div className="chart-box">
									<div className="chart-box__info">
										<div className="chart-box-title">
											<h3>SYNTHS DISTRIBUTION</h3>
											<span className="chart-box__number" />
										</div>
										<div className="chart-box-desc">Distribution of synths within the network</div>
									</div>
									{formattedDistribution && totalDistribution ? (
										<PieChart
											isLightMode={theme === 'light'}
											data={formattedDistribution.map(v => {
												return {
													x: v.name,
													y: v.value,
													label: `${v.name} (${((100 * v.value) / totalDistribution).toFixed(1)}%)`,
												};
											})}
										/>
									) : null}
									<div
										style={{
											width: '100%',
											textAlign: 'center',
											marginBottom: '20px',
										}}
									>
										Total Synth supply: {numeral(totalDistribution).format('$0,(0)')}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div className="container main-content">
					<div className="columns">
						<div className="column">
							<div className="footer-info">
								<div
									className={cx('theme-switcher', theme)}
									onClick={() => this.props.switchTheme(theme === 'dark' ? 'light' : 'dark')}
								>
									<label>{theme}</label>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}
}

const mapStateToProps = state => {
	const { charts, theme, markets, exchange, network } = state;
	return {
		charts,
		theme: theme.theme,
		markets,
		exchange,
		network,
	};
};

const ConnectedApp = connect(
	mapStateToProps,
	{
		switchTheme,
		fetchCharts,
		fetchOpenInterest,
		fetchTradingVolume,
		fetchUniswapData,
		fetchHAV,
		fetchNUSD,
		setPeriod,
		fetchNetworkData,
		fetchNetworkFees,
	}
)(App);
export default ConnectedApp;
