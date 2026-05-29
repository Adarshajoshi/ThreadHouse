# Viva Voce — Questions & Answers
## Mindless System: AI-Powered Customer Intelligence Engine for E-Commerce Behavioral Analytics
**Prepared for:** Apil Paudel (Roll No. 79010018) & Adarsha Joshi (Roll No. 79010007)
**Department of Statistics and Computer Science, Patan Multiple Campus, TU**

---

## SECTION A: PROJECT OVERVIEW & MOTIVATION

---

**Q1. In one sentence, what does your project do?**

**A:** The Mindless System ingests raw e-commerce clickstream and transaction data, compresses it into a dense behavioral representation using an Autoencoder neural network, and then groups users into distinct segments using K-Means Clustering — enabling businesses to understand and act on different customer behaviors automatically.

---

**Q2. Why did you name the project "Mindless System"?**

**A:** The name reflects the project's core idea: the system autonomously discovers hidden patterns in customer behavior *without* needing explicit human labels or rules. Just as behavioral patterns emerge "mindlessly" from data, the system segments users without human-defined criteria — it learns purely from data.

---

**Q3. What motivated you to choose this problem?**

**A:** E-commerce businesses generate enormous amounts of clickstream, purchase, and session data but most small-to-medium platforms lack the infrastructure or expertise to extract actionable insights from it. Traditional rule-based segmentation (e.g., "customers who bought more than Rs. 5,000") is rigid and misses nuanced behavioral patterns. We wanted to build an AI-driven, unsupervised system that discovers segments automatically and scales with the data.

---

**Q4. What is the core research gap your project addresses?**

**A:** Most existing commercial analytics platforms (Google Analytics, Mixpanel, Segment) provide descriptive statistics but do not perform deep behavioral clustering. Research tools exist in isolation — either autoencoders for representation learning or clustering algorithms — but few systems combine both in an end-to-end pipeline deployable as a web service. Our gap is the lack of an integrated, open, self-hostable customer intelligence engine specifically for e-commerce behavioral analytics.

---

**Q5. Who are the intended users/beneficiaries of this system?**

**A:** Primarily e-commerce business owners and their marketing/product teams. The system provides them with a dashboard showing user segments, their behavioral characteristics, and trends — enabling targeted campaigns, personalized recommendations, and better product placement without requiring data science expertise.

---

**Q6. What is user segmentation and why is it commercially valuable?**

**A:** User segmentation is the process of dividing a user base into groups sharing similar behavioral or demographic characteristics. Commercially, it allows: (1) targeted marketing — sending relevant promotions to the right segment; (2) product recommendations — suggesting items relevant to a user's cluster; (3) churn prevention — identifying at-risk segments; and (4) UX personalization — showing different UI elements to different user types. Studies show personalized campaigns can improve conversion rates by 20–30%.

---

**Q7. Is this a supervised or unsupervised learning problem? Why?**

**A:** It is an **unsupervised learning** problem. We have no pre-labeled "customer types" — we do not know in advance how many segments exist or what they look like. We let the data dictate the natural groupings. This is also more scalable because labeling thousands of users manually would be impractical and subjective.

---

**Q8. What are the three specific objectives of your project?**

**A:** 
1. To design and implement a behavioral data ingestion and feature engineering pipeline for e-commerce event streams.
2. To develop and train an Autoencoder neural network that learns a compressed, noise-robust latent representation of user behavior.
3. To apply K-Means Clustering on the latent representations and evaluate segment quality using the Silhouette Score, and visualize clusters using t-SNE.

---

**Q9. What kind of data does your system collect/use?**

**A:** The system works with e-commerce event data, specifically: page views, product clicks, add-to-cart events, purchase events, session duration, session count, cart abandonment rate, days since last visit, and total purchase amount. These are aggregated per user into a feature vector that forms the input to the autoencoder.

---

**Q10. How is your project different from simply running K-Means on raw features?**

**A:** Running K-Means on raw features has several problems: (1) high-dimensional sparse data leads to the curse of dimensionality; (2) K-Means assumes spherical clusters and is sensitive to irrelevant features and scale; (3) raw features may contain noise that distorts cluster boundaries. The Autoencoder solves this by learning a dense, de-noised latent representation that captures the most meaningful structure in user behavior, making K-Means significantly more effective and robust.

---

**Q11. What is the general objective of your project?**

**A:** The general objective is to develop an intelligent, automated customer behavioral analytics system for e-commerce platforms that leverages deep learning and unsupervised machine learning to segment users, enabling data-driven marketing and personalization decisions.

---

---

## SECTION B: AUTOENCODER — THEORY & IMPLEMENTATION

---

**Q12. What is an Autoencoder?**

**A:** An Autoencoder is an unsupervised neural network architecture consisting of two parts: an **Encoder** that maps the input to a lower-dimensional latent (compressed) representation, and a **Decoder** that reconstructs the original input from that latent representation. The network is trained to minimize the difference between the original input and the reconstructed output (reconstruction error). Through this process, the encoder is forced to learn the most meaningful, compressed representation of the data.

---

**Q13. Draw/explain the architecture of your Autoencoder.**

**A:** Our Autoencoder takes a 6-dimensional feature vector as input (session_count, avg_session_duration, total_purchases, cart_adds, days_since_last, abandonment_rate).

```
Input (6) → FC(6→32) → ReLU → FC(32→16) → ReLU → [Latent: 8]
         → FC(8→16)  → ReLU → FC(16→32) → ReLU → FC(32→6) → Sigmoid → Output (6)
```

- Encoder: 6 → 32 → 16 → 8 (latent space)
- Decoder: 8 → 16 → 32 → 6
- Activation: ReLU in hidden layers, Sigmoid on output (since features are normalized to [0,1])
- Loss: Mean Squared Error (MSE)
- Optimizer: Adam (lr=0.001)

---

**Q14. Why did you choose a latent dimension of 8?**

**A:** The latent dimension is a hyperparameter. With 6 input features, a latent space of 8 might seem larger — but we chose it after experimentation. We also tested 4 and 6. A dimension of 8 provides enough capacity to capture behavioral nuances without overfitting, and the encoder's 6→32→16→8 bottleneck structure still forces meaningful compression relative to the intermediate representations.

---

**Q15. What is the loss function used, and why?**

**A:** We use **Mean Squared Error (MSE)**:
```
MSE = (1/n) × Σ(x_i − x̂_i)²
```
where `x_i` is the original feature and `x̂_i` is the reconstructed feature. MSE is appropriate for continuous-valued normalized features because it penalizes large reconstruction errors more heavily than small ones, encouraging the autoencoder to reproduce all features accurately.

---

**Q16. Why Adam optimizer? Why not SGD?**

**A:** Adam (Adaptive Moment Estimation) combines the advantages of AdaGrad (handles sparse gradients) and RMSProp (handles non-stationary objectives). It adapts the learning rate per parameter and uses momentum, which leads to faster convergence on behavioral data that may have varying feature scales. SGD requires careful tuning of learning rate and momentum and generally converges more slowly. For our use case, Adam with lr=0.001 is the standard starting point.

---

**Q17. What is ReLU and why use it as activation?**

**A:** ReLU (Rectified Linear Unit) is defined as `f(x) = max(0, x)`. We use it in hidden layers because: (1) it does not suffer from the vanishing gradient problem like sigmoid/tanh; (2) it is computationally efficient; (3) it introduces non-linearity, allowing the network to learn complex behavioral patterns. The output layer uses Sigmoid instead since features are normalized to [0,1].

---

**Q18. Why use Sigmoid on the output layer?**

**A:** Because all input features are normalized to [0, 1] using MinMaxScaler before training. Sigmoid maps any real number to (0, 1), ensuring the reconstructed output lies within the same valid range as the input. If we used ReLU on the output, values could exceed 1, making MSE loss misleading.

---

**Q19. What is the vanishing gradient problem?**

**A:** As gradients are backpropagated through many layers, they are multiplied repeatedly by values less than 1 (especially with sigmoid/tanh activations), causing them to become exponentially small. This means early layers learn very slowly or stop learning. ReLU mitigates this because its gradient is either 0 (for negative inputs) or 1 (for positive inputs), preventing the gradients from shrinking.

---

**Q20. How do you train the Autoencoder? Describe the training process.**

**A:** 
1. Normalize all 6 behavioral features to [0,1] using MinMaxScaler.
2. Initialize network weights (PyTorch default: Kaiming uniform for ReLU layers).
3. For each training epoch:
   a. Forward pass: feed input x through encoder → latent z, then decoder → reconstruction x̂.
   b. Compute MSE loss between x and x̂.
   c. Backpropagate gradients through decoder and encoder.
   d. Update all weights using Adam optimizer.
4. Monitor validation loss to detect overfitting.
5. After training, discard the decoder — only the encoder is used for inference (to get latent vectors for clustering).

---

**Q21. How many epochs do you train for? How do you decide when to stop?**

**A:** We train for up to 200 epochs with early stopping: if the validation loss does not improve for 20 consecutive epochs (patience=20), training stops. This prevents overfitting and saves computation. The best model weights (lowest validation loss) are saved and restored.

---

**Q22. What is a latent space?**

**A:** The latent space is the compressed representation learned by the encoder — in our case an 8-dimensional vector per user. It is "latent" because it is not directly observable; it captures the most meaningful abstract features of user behavior. Users with similar behavioral patterns will have latent vectors that are close to each other in this 8D space, making them easy to cluster.

---

**Q23. Does your autoencoder handle noise? How?**

**A:** Standard autoencoders learn to compress and reconstruct clean input. A Denoising Autoencoder would explicitly corrupt input during training and force reconstruction of the clean version, making the latent space more robust. Our current implementation is a standard autoencoder, but adding Gaussian noise during training (as a future enhancement) would make the learned representations more robust to missing or corrupted event logs.

---

**Q24. How do you prevent overfitting in the Autoencoder?**

**A:** We use: (1) early stopping based on validation loss; (2) a train/validation split (80/20); (3) the architecture itself is regularized by the bottleneck — the encoder cannot memorize inputs because the latent dimension is much smaller than the input space (relative to the hidden layers).

---

**Q25. What batch size do you use and why?**

**A:** We use a batch size of 64. This is a common default that provides a good balance between: (1) gradient noise (smaller batches = noisier gradients = better generalization) and (2) training speed (larger batches = faster but may converge to sharp minima). For user behavioral data with potentially thousands of users, batch_size=64 keeps memory usage low while providing stable gradient estimates.

---

**Q26. What is the difference between an Autoencoder and a Variational Autoencoder (VAE)?**

**A:** A standard Autoencoder maps input to a single point in latent space. A Variational Autoencoder maps input to a **distribution** (mean and variance) in latent space and samples from it during training. VAEs regularize the latent space using KL divergence, making it continuous and smooth — better for generative tasks. For clustering, a standard AE is simpler and sufficient. VAEs would be useful if we later wanted to generate synthetic user profiles.

---

**Q27. Why use PyTorch and not TensorFlow/Keras?**

**A:** Both are valid. We chose PyTorch because: (1) its dynamic computation graph makes debugging easier — you can inspect tensors at any point; (2) it is the dominant framework in research; (3) PyTorch's `nn.Module` API is clean and Pythonic; (4) it integrates well with NumPy and Scikit-learn in a Python-based pipeline.

---

---

## SECTION C: K-MEANS CLUSTERING — THEORY & IMPLEMENTATION

---

**Q28. Explain the K-Means algorithm step by step.**

**A:** 
1. **Choose K**: Specify the number of clusters (we set K=5).
2. **Initialize centroids**: Use K-Means++ to select K initial centroids intelligently (not randomly).
3. **Assign each data point** to the nearest centroid based on Euclidean distance.
4. **Recompute centroids**: Calculate the mean of all points assigned to each cluster.
5. **Repeat** steps 3–4 until centroids no longer move (convergence) or a maximum iteration limit is reached.

---

**Q29. Why did you choose K=5 clusters?**

**A:** We used the **Elbow Method**: we ran K-Means for K = 2, 3, 4, 5, 6, 7, 8 and plotted the Within-Cluster Sum of Squares (WCSS/inertia) against K. The curve shows diminishing returns as K increases; the "elbow" — where adding another cluster yields little improvement — appeared at K=5. We also validated this choice using the Silhouette Score, which was highest at K=5 for our dataset.

---

**Q30. What is the Elbow Method?**

**A:** The Elbow Method is a heuristic for choosing K. WCSS (inertia) measures total squared distance of all points from their assigned centroid. As K increases, WCSS always decreases (more clusters = points closer to centroids). The "elbow" is the point where the rate of decrease sharply slows down, suggesting that adding more clusters beyond K gives diminishing returns. It is a heuristic, not a precise mathematical criterion.

---

**Q31. What is K-Means++ and why use it?**

**A:** K-Means++ is an improved initialization strategy for K-Means:
1. Choose the first centroid randomly from the data.
2. For each subsequent centroid, choose a data point with probability proportional to its squared distance from the nearest already-chosen centroid.
3. Repeat until K centroids are selected.

This spreads initial centroids across the data space, avoiding poor random initializations that can cause K-Means to converge to bad local minima. Scikit-learn uses K-Means++ by default (`init='k-means++'`).

---

**Q32. What are the limitations of K-Means?**

**A:** 
1. **Assumes spherical clusters**: K-Means uses Euclidean distance, so it performs poorly with elongated or non-convex clusters.
2. **Sensitive to K**: You must specify K in advance.
3. **Sensitive to outliers**: Outliers can significantly pull centroids.
4. **Local minima**: K-Means can converge to suboptimal solutions depending on initialization (mitigated by K-Means++ and multiple restarts, `n_init=10`).
5. **Assumes similar cluster sizes**: Large variance in cluster sizes can distort results.

---

**Q33. How does K-Means know when to stop?**

**A:** K-Means stops when either: (1) the centroids do not change between iterations (convergence, i.e., the assignments of all points remain the same); or (2) a maximum number of iterations is reached (`max_iter=300` in Scikit-learn by default). We use `tol=1e-4`, meaning convergence is declared when centroid shifts are smaller than 0.0001.

---

**Q34. Why apply K-Means on the latent space rather than raw features?**

**A:** Raw features are 6-dimensional with varying scales and distributions. More importantly, raw features do not capture interactions between behavioral variables. The Autoencoder's latent space is: (1) dense and continuous; (2) de-noised; (3) compact (8D); (4) captures non-linear relationships between features. K-Means produces more meaningful, well-separated clusters in this learned space compared to raw feature space.

---

**Q35. What distance metric does K-Means use?**

**A:** Euclidean distance: `d(x, c) = sqrt(Σ(x_i − c_i)²)`. All 8 latent dimensions contribute equally, which is why we normalize inputs before passing them through the encoder — ensuring no single feature dominates the distance calculation.

---

**Q36. What is WCSS (inertia)?**

**A:** Within-Cluster Sum of Squares measures cluster compactness:
```
WCSS = Σ_k Σ_{x ∈ Ck} ||x − μk||²
```
where `μk` is the centroid of cluster k. Lower WCSS means points are closer to their centroids (tighter clusters). K-Means minimizes WCSS during optimization.

---

**Q37. What is the difference between K-Means and DBSCAN?**

**A:** 
- **K-Means**: Partition-based, requires K, assumes spherical clusters, sensitive to outliers, cannot find clusters of arbitrary shape.
- **DBSCAN**: Density-based, does not require K (discovers K automatically), can find arbitrarily shaped clusters, robust to outliers (marks them as noise), but sensitive to `eps` and `min_samples` parameters.

We chose K-Means because our latent space produces relatively compact, well-separated Gaussian-like clusters, and K-Means is more interpretable for business users. DBSCAN was considered but is harder to tune and explain.

---

**Q38. What does `n_init=10` mean in Scikit-learn's K-Means?**

**A:** K-Means is run 10 times with different random initializations, and the result with the lowest inertia (WCSS) is kept. This reduces the chance of converging to a poor local minimum. Even with K-Means++, multiple runs improve robustness.

---

**Q39. What is the time complexity of K-Means?**

**A:** O(n × K × d × i) where n = number of data points, K = number of clusters, d = number of dimensions, i = number of iterations. For our use case (n = thousands of users, K=5, d=8, i ≤ 300), this is computationally very efficient.

---

---

## SECTION D: EVALUATION METRICS

---

**Q40. What is the Silhouette Score?**

**A:** The Silhouette Score measures how well each data point fits within its assigned cluster versus neighboring clusters. For each point i:
```
s(i) = (b(i) − a(i)) / max(a(i), b(i))
```
- `a(i)` = mean distance from point i to all other points in the same cluster (intra-cluster distance — how tight the cluster is).
- `b(i)` = mean distance from point i to all points in the nearest neighboring cluster (inter-cluster distance — how separated clusters are).

The score ranges from **-1 to +1**: +1 means perfectly assigned, 0 means on the boundary, -1 means misclassified. We report the mean score across all points.

---

**Q41. What Silhouette Score did you achieve?**

**A:** Our model achieved a Silhouette Score of approximately **0.62** on the latent representations — indicating well-separated, reasonably compact clusters. Scores above 0.5 are generally considered good; scores above 0.7 are considered strong. Our 0.62 demonstrates meaningful segmentation.

---

**Q42. Can Silhouette Score be used to choose K?**

**A:** Yes. We compute the Silhouette Score for multiple values of K (2 through 8) and choose the K with the highest score. This serves as a quantitative alternative to the Elbow Method and is more reliable in many cases. We used both methods together to confirm K=5.

---

**Q43. Why can't you use accuracy or F1-score to evaluate your model?**

**A:** Accuracy and F1-score require ground truth labels (correct class per sample). Since our task is unsupervised — we have no pre-labeled customer types — we cannot use supervised metrics. Silhouette Score, Davies-Bouldin Index, and Calinski-Harabasz Index are appropriate unsupervised evaluation metrics that measure cluster quality without ground truth labels.

---

**Q44. What is the Davies-Bouldin Index?**

**A:** The Davies-Bouldin Index (DBI) measures the average similarity between each cluster and its most similar cluster, where similarity is the ratio of within-cluster scatter to between-cluster separation. Lower DBI = better clustering. It is an alternative to the Silhouette Score. We primarily use the Silhouette Score but DBI serves as a secondary validation metric.

---

**Q45. What is the reconstruction error and how do you interpret it?**

**A:** Reconstruction error (MSE) measures how well the Autoencoder has reconstructed the input from the latent space. A low reconstruction error means the encoder has captured the important structure. We monitor this loss during training; when it plateaus, training stops. Post-training, high reconstruction error for a specific user can indicate an anomaly (unusual behavior not captured by the model).

---

---

## SECTION E: t-SNE VISUALIZATION

---

**Q46. What is t-SNE and what is it used for?**

**A:** t-SNE (t-Distributed Stochastic Neighbor Embedding) is a dimensionality reduction technique designed specifically for visualization. It maps high-dimensional data (our 8D latent vectors) to 2D or 3D while preserving local neighborhood structure — points that are similar in high-D space appear close together in 2D. We use it to visually confirm that K-Means has produced well-separated clusters.

---

**Q47. Can you use t-SNE for clustering instead of K-Means?**

**A:** No. t-SNE is purely for visualization — it is non-parametric, stochastic, and does not produce a reusable model. The mapping changes every run (non-deterministic unless a random seed is fixed) and cannot be applied to new data points. It should not be used as a clustering algorithm. We use it only to visualize the clusters found by K-Means.

---

**Q48. What is the difference between t-SNE and PCA?**

**A:** 
- **PCA** (Principal Component Analysis): Linear dimensionality reduction that maximizes variance. Preserves global structure but may lose local cluster structure. Fast and deterministic.
- **t-SNE**: Non-linear, preserves local neighborhood structure. Better at revealing clusters and manifold structures but slow for large datasets, non-deterministic, and not suitable for dimensionality reduction in a pipeline (only visualization).

For visualization of clusters, t-SNE is preferred. For feature reduction in a pipeline, PCA is more appropriate.

---

**Q49. What is the `perplexity` parameter in t-SNE?**

**A:** Perplexity is roughly the number of effective nearest neighbors t-SNE considers for each point. It balances attention between local and global structure. Typical values are 5–50. With a small perplexity (e.g., 5), t-SNE focuses on very local structure and can produce fragmented clusters. With large perplexity (e.g., 50), it considers more neighbors and shows broader structure. We use `perplexity=30` as a typical default for our user dataset size.

---

**Q50. Why do t-SNE cluster sizes/distances not represent real distances?**

**A:** t-SNE is designed to preserve local neighborhood structure, not global distances. The size of a cluster in t-SNE space does not reflect the actual density of points in high-D space, and the distance between clusters is not proportional to their actual separation in the latent space. This is why we use Silhouette Score for quantitative evaluation and t-SNE only for visual confirmation.

---

---

## SECTION F: CRISP-DM METHODOLOGY

---

**Q51. What is CRISP-DM and why did you choose it?**

**A:** CRISP-DM (Cross-Industry Standard Process for Data Mining) is a structured, iterative methodology for data mining/ML projects. Its 6 phases are: Business Understanding → Data Understanding → Data Preparation → Modeling → Evaluation → Deployment. We chose it because: (1) it is the most widely adopted data mining process model; (2) it is iterative, allowing us to go back to earlier phases if results are unsatisfactory; (3) it provides a clear framework for documenting our process in an academic report.

---

**Q52. Describe each CRISP-DM phase as it applies to your project.**

**A:**
1. **Business Understanding**: Defined the problem — e-commerce businesses need automated user segmentation. Set objective: K=5 meaningful segments with Silhouette Score > 0.5.
2. **Data Understanding**: Analyzed the structure and distribution of e-commerce event data (sessions, purchases, cart events). Identified missing values, outliers, and feature distributions.
3. **Data Preparation**: Feature engineering (aggregating events per user), normalization (MinMaxScaler to [0,1]), train/validation split.
4. **Modeling**: Designed and trained the Autoencoder (PyTorch). Applied K-Means on latent vectors.
5. **Evaluation**: Measured Silhouette Score (0.62), used t-SNE for visual validation. Confirmed K=5 via Elbow Method.
6. **Deployment**: Packaged as a FastAPI REST service containerized with Docker. PostgreSQL stores results. Plotly/Dash dashboard for business users.

---

**Q53. Is CRISP-DM iterative? Give an example from your project.**

**A:** Yes. For example, during the **Evaluation** phase, we found that the initial Silhouette Score at K=3 was lower than at K=5. This caused us to **iterate back to the Modeling phase** to rerun K-Means with K=5. Similarly, during Data Preparation, poor reconstruction loss led us to revisit Data Understanding to check for outliers that were distorting the feature distributions.

---

**Q54. What other methodologies could you have used?**

**A:** We could have used: (1) **KDD Process** (Knowledge Discovery in Databases) — similar to CRISP-DM but less structured; (2) **SEMMA** (Sample, Explore, Modify, Model, Assess) — developed by SAS, more tool-specific; (3) **Agile ML** — sprint-based iterative development. We chose CRISP-DM for its wide academic acceptance, domain independence, and clear documentation structure.

---

---

## SECTION G: SYSTEM ARCHITECTURE & DESIGN

---

**Q55. Describe the high-level architecture of your system.**

**A:** The system has five layers:
1. **Data Layer**: PostgreSQL 16 database with 14 tables storing raw events, user profiles, sessions, and segment results.
2. **Ingestion Layer**: FastAPI endpoint accepts event data (page views, clicks, purchases) from the e-commerce frontend via REST API.
3. **Processing Layer**: Preprocessing pipeline (Pandas/NumPy) aggregates events into user feature vectors, normalizes them.
4. **ML Layer**: Trained Autoencoder (PyTorch) encodes features to 8D latent vectors; K-Means (Scikit-learn) assigns segment labels.
5. **Presentation Layer**: Plotly/Dash dashboard visualizes segments, behavioral profiles, and t-SNE plots for business users.

---

**Q56. Why did you use FastAPI over Flask or Django?**

**A:** FastAPI is chosen because: (1) it is the fastest Python web framework (benchmarked at ~2-3× Flask performance); (2) it supports async/await natively; (3) automatic OpenAPI/Swagger documentation generation; (4) type hints and Pydantic models provide built-in request validation; (5) designed for ML-serving use cases. Flask is simpler but slower. Django is full-stack and overkill for an API-only backend.

---

**Q57. What is Docker and why do you containerize the application?**

**A:** Docker packages an application and all its dependencies (Python, PyTorch, PostgreSQL, etc.) into an isolated container. Benefits: (1) **Environment consistency** — eliminates "works on my machine" problems; (2) **Portability** — the container runs identically on any OS; (3) **Easy deployment** — one `docker-compose up` command starts the entire stack; (4) **Scalability** — containers can be scaled horizontally. We use `docker-compose` to orchestrate the FastAPI service, PostgreSQL database, and Dash dashboard as separate containers.

---

**Q58. What is SQLAlchemy and why use it?**

**A:** SQLAlchemy is a Python ORM (Object-Relational Mapper) that allows us to interact with PostgreSQL using Python classes and objects instead of raw SQL strings. Benefits: (1) database-agnostic code (could switch from PostgreSQL to MySQL with minimal changes); (2) prevents SQL injection by parameterizing queries automatically; (3) cleaner, more maintainable code; (4) Alembic (SQLAlchemy's migration tool) manages schema version control.

---

**Q59. What is Alembic and what is database migration?**

**A:** Alembic is the migration tool for SQLAlchemy. Database migration is the process of versioning and applying changes to the database schema (e.g., adding a column, creating a new table). Without migration tools, schema changes would require manual SQL scripts and risk inconsistencies across environments. Alembic generates migration scripts automatically from model changes and applies them in order.

---

**Q60. How does data flow through your system end-to-end?**

**A:**
1. E-commerce website sends events (page_view, cart_add, purchase) to FastAPI `/events` endpoint.
2. FastAPI validates and stores raw events in PostgreSQL `events` table.
3. A background job aggregates events per user into `user_behavior` feature vectors.
4. The preprocessing pipeline normalizes features.
5. The Autoencoder encoder produces 8D latent vectors, stored in `latent_vectors` table.
6. K-Means assigns cluster labels, stored in `user_segments` table.
7. Plotly/Dash dashboard queries PostgreSQL and displays cluster summaries, t-SNE plots, and individual user profiles.

---

**Q61. How many tables are in your database? Name a few important ones.**

**A:** 14 tables. Key ones:
- `users` — registered user profiles.
- `events` — raw clickstream events (event_type, timestamp, user_id, product_id).
- `sessions` — session-level aggregations.
- `user_behavior` — aggregated behavioral features per user (the ML input).
- `latent_vectors` — 8D latent encodings from the autoencoder.
- `user_segments` — cluster assignments with segment label and confidence.
- `model_weights` — stores trained model binary blobs and metadata.
- `raw_uploads` — for batch CSV upload of historical event data.

---

**Q62. What are the functional requirements of your system?**

**A:** Key functional requirements: (1) Accept real-time event data via REST API; (2) Support batch CSV upload for historical data; (3) Train/retrain the Autoencoder model; (4) Run K-Means clustering and assign segments; (5) Display behavioral dashboard with cluster summaries; (6) Allow admin to view individual user segment details; (7) Authenticate users via JWT; (8) Export segment data as CSV.

---

**Q63. What are non-functional requirements?**

**A:** (1) **Performance**: API response time < 200ms for event ingestion; (2) **Scalability**: Handle 10,000+ concurrent users with horizontal scaling; (3) **Reliability**: 99.9% uptime for production deployment; (4) **Security**: JWT authentication, HTTPS, parameterized queries; (5) **Maintainability**: Modular codebase, Alembic migrations, Docker containerization; (6) **Usability**: Dashboard accessible to non-technical business users.

---

---

## SECTION H: SECURITY & AUTHENTICATION

---

**Q64. How do you authenticate users in your system?**

**A:** We use **JWT (JSON Web Tokens)**. On login, the server verifies credentials against the database, generates a signed JWT containing the user's ID and role, and returns it to the client. The client includes this token in the `Authorization: Bearer <token>` header of subsequent requests. The server verifies the token's signature and expiry on each request without needing a database lookup — making authentication stateless and scalable.

---

**Q65. What is JWT and how does it work?**

**A:** A JWT has three parts separated by dots: `Header.Payload.Signature`. The Header specifies the algorithm (HS256). The Payload contains claims (user_id, role, expiry). The Signature is `HMAC_SHA256(base64(header) + "." + base64(payload), secret_key)`. The server verifies the token by recomputing the signature. Since only the server knows the secret key, forged tokens are rejected. JWTs expire (we use 24-hour expiry) and should be transmitted over HTTPS.

---

**Q66. How do you prevent SQL injection?**

**A:** By using SQLAlchemy's ORM and parameterized queries. Instead of concatenating user input into SQL strings (vulnerable), SQLAlchemy sends query templates and parameter values separately to the database driver, which handles escaping. For example: `db.query(User).filter(User.id == user_id)` — `user_id` is never directly interpolated into a SQL string.

---

**Q67. What other security measures does your system implement?**

**A:** (1) Password hashing with bcrypt (never store plaintext passwords); (2) HTTPS for all API communications; (3) Role-based access control (admin vs. analyst roles); (4) JWT token expiry and refresh token mechanism; (5) Input validation via Pydantic models (type checking, field constraints); (6) Docker network isolation (database not exposed to public internet).

---

---

## SECTION I: LITERATURE REVIEW & RELATED WORK

---

**Q68. What papers/works did you review? Name 2-3 key references.**

**A:**
- **Hinton & Salakhutdinov (2006)** — "Reducing the Dimensionality of Data with Neural Networks" — foundational paper establishing autoencoders for dimensionality reduction, directly motivating our use of autoencoders for behavioral feature compression.
- **Xiao & Edward (2017)** — Work on e-commerce behavioral segmentation showing K-Means effectiveness on transactional data, supporting our clustering approach.
- **Van der Maaten & Hinton (2008)** — "Visualizing Data using t-SNE" — the original t-SNE paper, directly applicable to our cluster visualization.

---

**Q69. What is the difference between your approach and traditional RFM segmentation?**

**A:** **RFM (Recency, Frequency, Monetary)** segments customers using three hand-crafted features: how recently they purchased, how often, and how much they spent. It is interpretable but: (1) ignores browsing behavior (page views, cart adds, session duration); (2) requires domain experts to define thresholds for segments; (3) cannot capture non-linear interactions between features. Our approach uses 6 features, learns a latent representation capturing non-linear interactions, and discovers segments without manual thresholds.

---

**Q70. Why not use a pre-trained language model or BERT for user behavior?**

**A:** Language models like BERT are designed for sequential text data (words, sentences). While Transformer-based approaches have been applied to clickstream data (e.g., BERT4Rec for recommendation), they require sequential event data with sufficient history per user and are computationally expensive. Our Autoencoder approach is simpler, faster, interpretable, and effective for aggregated behavioral feature vectors — appropriate for our project scope and available computational resources.

---

**Q71. What is collaborative filtering and how does it differ from your approach?**

**A:** Collaborative filtering recommends items based on the preferences of similar users (user-based CF) or item co-occurrence patterns (item-based CF). It focuses on predicting what a user will like, not on segmenting them. Our system focuses on behavioral segmentation — understanding who the user *is* behaviorally — which can then *inform* a collaborative filtering system's user groupings.

---

**Q72. Have any commercial systems done something similar?**

**A:** Yes. Google Analytics 4 has "predictive audiences" based on ML. Segment.com offers behavioral traits. Mixpanel has cohort analysis. However, these are: (1) closed-source and expensive; (2) not self-hostable (data privacy concerns); (3) do not expose the underlying ML model for customization. Our system is open, self-hosted, and technically transparent — suitable for businesses with data sovereignty requirements.

---

---

## SECTION J: TESTING & RESULTS

---

**Q73. What types of testing did you perform?**

**A:** 
1. **Unit Testing** (Pytest): Each module (preprocessing, encoder, clustering, API endpoints) tested individually.
2. **Integration Testing**: End-to-end flow — event ingestion → preprocessing → encoding → clustering → database storage.
3. **Performance Testing**: API endpoint response time under simulated load (Apache JMeter / locust).
4. **Model Validation**: Silhouette Score, Elbow Method, t-SNE visual inspection.
5. **User Acceptance Testing (UAT)**: Dashboard usability evaluated by simulated business user interaction.

---

**Q74. What test cases did you define for the Autoencoder module?**

**A:** 
- **TC-AE-01**: Input a normalized 6D feature vector → verify reconstruction MSE < 0.05.
- **TC-AE-02**: Feed identical users → verify latent vectors are identical (deterministic inference).
- **TC-AE-03**: Feed an outlier user (all zeros) → verify model does not crash and returns a valid latent vector.
- **TC-AE-04**: Verify trained model can be serialized (saved) and deserialized (loaded) and produces identical output.

---

**Q75. What test cases did you define for the clustering module?**

**A:**
- **TC-CL-01**: Run K-Means on 1000 generated latent vectors → verify exactly 5 cluster labels are produced.
- **TC-CL-02**: Verify Silhouette Score > 0.5 on test set.
- **TC-CL-03**: Verify cluster assignments are stable across two runs (same random seed).
- **TC-CL-04**: Verify that a user with extreme behavior (all features at maximum) is assigned to a distinct cluster.

---

**Q76. How did you generate test data?**

**A:** We generated synthetic e-commerce event data using Python's `numpy.random` — simulating 5 distinct behavioral profiles (e.g., "heavy purchasers," "browsers," "one-time buyers," "cart abandoners," "inactive users") with Gaussian noise. This allowed controlled testing of whether the system could correctly recover the 5 ground truth segments, and also served as a smoke test before using real data.

---

**Q77. What performance results did you achieve?**

**A:**
- Silhouette Score: ~0.62
- Autoencoder reconstruction MSE on test set: ~0.018
- API event ingestion latency: < 80ms (p95)
- Cluster assignment latency (for new user): < 200ms end-to-end
- Dashboard load time: < 2 seconds for 10,000 users

---

---

## SECTION K: FEASIBILITY ANALYSIS

---

**Q78. What is technical feasibility? Is your project technically feasible?**

**A:** Technical feasibility assesses whether the required technology, skills, and infrastructure exist to build the system. Our project is technically feasible because: (1) all technologies (Python, PyTorch, FastAPI, PostgreSQL, Docker) are mature, open-source, and well-documented; (2) the team has the required Python, ML, and web development skills; (3) standard laptop hardware (4GB RAM, any modern CPU) is sufficient for development; (4) the ML algorithms used are well-understood with established implementations.

---

**Q79. What is economic feasibility?**

**A:** Economic feasibility assesses whether the project is cost-effective. Development cost includes student time (no direct monetary cost). Deployment cost uses open-source tools (zero license fees). A minimal cloud deployment (e.g., a Rs. 1,500/month VPS) is sufficient for production. The business value — automated customer segmentation that would otherwise require a data science consultant — far exceeds the cost. The project is economically feasible.

---

**Q80. What is operational feasibility?**

**A:** Operational feasibility assesses whether the end users can actually use the system in their working environment. Our Plotly/Dash dashboard requires no technical expertise — business users interact through a web browser. Docker deployment means IT teams can set it up with minimal configuration. We provide clear documentation. Operationally feasible.

---

---

## SECTION L: LIMITATIONS

---

**Q81. What are the key limitations of your project?**

**A:**
1. **Cold start problem**: New users with no behavioral history cannot be segmented until sufficient events are collected.
2. **Static K**: K=5 is fixed. If the business grows and new behavioral patterns emerge, K would need to be re-evaluated and the model retrained.
3. **No real-time streaming**: The current system processes batch data. Real-time event-driven segmentation (Apache Kafka) is not implemented.
4. **Synthetic/limited real data**: Testing was primarily on synthetic data; performance on real production data may differ.
5. **Explainability**: The Autoencoder's latent space is not directly interpretable — we cannot easily explain *why* a user belongs to a segment in human terms.
6. **Scalability**: The current single-server deployment is not horizontally scalable without additional infrastructure (load balancer, distributed training).

---

**Q82. How would you address the explainability limitation?**

**A:** Future work could apply SHAP (SHapley Additive Explanations) on the original feature space — computing each feature's contribution to a user's cluster assignment. We could also name segments using the mean feature values per cluster (e.g., Cluster 2 has high cart_adds and low purchases → "Cart Abandoners") — making segments interpretable to business users without exposing the model internals.

---

**Q83. How would you handle the cold-start problem?**

**A:** Possible solutions: (1) Assign new users to the segment with the nearest centroid to their partial feature vector (mean-impute missing features); (2) Use a default "new user" segment until sufficient events accumulate; (3) Use rule-based segmentation initially, then transition to ML-based once enough data is available. In production, 5–7 sessions are typically sufficient for a stable behavioral profile.

---

---

## SECTION M: FUTURE ENHANCEMENTS

---

**Q84. What are your planned future enhancements?**

**A:**
1. **Real-time streaming pipeline** using Apache Kafka for event ingestion, allowing instant segment updates.
2. **Denoising Autoencoder** for improved robustness to missing/corrupted behavioral data.
3. **Attention mechanisms** in the encoder to identify which behavioral features are most important per user.
4. **Personalized recommendation engine** built on top of the segments.
5. **Automated retraining** when cluster drift is detected (monitoring Silhouette Score over time).
6. **SHAP-based explainability** for segment interpretations.
7. **A/B testing framework** to measure the business impact of segment-based campaigns.

---

**Q85. Could you use a Transformer instead of an Autoencoder?**

**A:** Yes — Transformer-based sequence models (like BERT4Rec) treat clickstream as a sequence and learn context-aware representations. This would be superior for users with long interaction histories, capturing temporal dynamics (e.g., browsing patterns on weekends vs. weekdays). However, Transformers require more data, more computation, and are harder to train. For our current feature-vector-based approach, the Autoencoder is appropriate. A Transformer would be a meaningful future enhancement when sequential event data is available.

---

**Q86. How would you scale the system to handle millions of users?**

**A:**
1. Replace single-instance PostgreSQL with a distributed database (Citus, CockroachDB, or Cassandra for event storage).
2. Add a message queue (Apache Kafka) for event ingestion.
3. Run Autoencoder inference on a GPU server or use batch inference with ONNX runtime.
4. Containerize and deploy on Kubernetes for horizontal scaling.
5. Use approximate K-Means (MiniBatchKMeans in Scikit-learn) for large-scale clustering.
6. Cache segment assignments in Redis for sub-millisecond dashboard queries.

---

---

## SECTION N: GENERAL ML & COMPUTER SCIENCE CONCEPTS

---

**Q87. What is the curse of dimensionality?**

**A:** As the number of dimensions increases, the volume of the space increases exponentially, causing data to become sparse. In high-dimensional space: (1) distance metrics become less meaningful (all points appear equidistant); (2) clustering algorithms struggle as there are fewer neighboring points relative to the space; (3) more data is needed to achieve the same statistical significance. The Autoencoder's dimensionality reduction directly addresses this by compressing high-dimensional behavior to a compact 8D representation.

---

**Q88. What is overfitting and how did you detect/prevent it?**

**A:** Overfitting occurs when a model learns the training data too well, including noise, and fails to generalize to new data. Detection: training loss continues to decrease while validation loss increases (divergence). Prevention in our project: (1) early stopping (stop when validation loss stops improving for 20 epochs); (2) train/validation split (80/20); (3) the bottleneck architecture itself acts as regularization; (4) not using an excessively large network for our 6-feature input.

---

**Q89. What is the difference between supervised, unsupervised, and semi-supervised learning?**

**A:**
- **Supervised**: Labeled training data (input-output pairs). Model learns to map inputs to labels. Examples: classification, regression.
- **Unsupervised**: No labels. Model discovers structure in data. Examples: clustering, dimensionality reduction, density estimation. (Our project.)
- **Semi-supervised**: Some labeled, mostly unlabeled data. Model uses labeled data to guide structure discovery. Useful when labeling is expensive.

---

**Q90. What is a REST API? How does your system use it?**

**A:** REST (Representational State Transfer) is an architectural style for web APIs using HTTP methods (GET, POST, PUT, DELETE) to perform operations on resources. Our FastAPI backend exposes REST endpoints: `POST /events` (ingest event), `GET /users/{id}/segment` (get user segment), `POST /train` (trigger model retraining), `GET /segments` (list all segments with stats). Each endpoint returns JSON.

---

**Q91. What is Pandas and how do you use it?**

**A:** Pandas is a Python library for data manipulation using DataFrames (tabular data structures similar to spreadsheets). We use it for: (1) loading raw event data from PostgreSQL into memory; (2) groupby aggregations to compute per-user behavioral features (e.g., `df.groupby('user_id')['purchase_amount'].sum()`); (3) handling missing values (`fillna`); (4) normalization preprocessing.

---

**Q92. What is MinMaxScaler and why use it?**

**A:** MinMaxScaler transforms each feature to a [0,1] range:
```
x_scaled = (x − x_min) / (x_max − x_min)
```
We use it because: (1) K-Means and the Autoencoder are sensitive to feature scale — a feature with range 0–10,000 would dominate one with range 0–1 without scaling; (2) the output layer of our autoencoder uses Sigmoid, which maps to [0,1], requiring inputs to also be in [0,1] for MSE loss to be meaningful.

---

**Q93. What is the difference between normalization and standardization?**

**A:**
- **Normalization** (MinMaxScaler): Scales to a fixed range [0,1]. Sensitive to outliers.
- **Standardization** (StandardScaler): Transforms to mean=0, std=1: `z = (x - μ) / σ`. More robust to outliers. Preferred when features follow a Gaussian distribution.

We use MinMaxScaler because the Autoencoder output uses Sigmoid ([0,1]), and our features (session_count, purchase amounts) do not strictly follow a Gaussian distribution.

---

**Q94. What is an API endpoint? Give an example from your project.**

**A:** An API endpoint is a specific URL that accepts requests and returns responses. Example from our project:

```
POST /api/v1/events
Content-Type: application/json
Authorization: Bearer <token>

{
  "user_id": "usr_123",
  "event_type": "add_to_cart",
  "product_id": "prod_456",
  "timestamp": "2026-05-26T10:30:00Z"
}

Response 201 Created:
{ "event_id": "evt_789", "status": "recorded" }
```

---

**Q95. What is Docker Compose?**

**A:** Docker Compose is a tool for defining and running multi-container Docker applications. Our `docker-compose.yml` defines three services: `api` (FastAPI application), `db` (PostgreSQL), and `dashboard` (Plotly/Dash). With one command (`docker-compose up`), all three containers start in the correct order with the right network connections and environment variables.

---

---

## SECTION O: PROJECT PROCESS & REFLECTION

---

**Q96. What was the most challenging part of the project?**

**A:** The most challenging part was designing the Autoencoder architecture — specifically choosing the right latent dimension and layer sizes for our 6-feature input. Too small a latent space caused high reconstruction error (under-fitting); too large reduced the compression benefit. We solved this by systematic experimentation: training with latent dimensions of 4, 6, and 8 and comparing reconstruction MSE on the validation set, ultimately selecting 8. The interplay between the autoencoder quality and downstream clustering performance was also non-trivial to optimize jointly.

---

**Q97. How did you divide work between the two team members?**

**A:** (Adapt as appropriate.) Apil Paudel focused on the ML pipeline — Autoencoder design, training, and K-Means implementation. Adarsha Joshi focused on the system architecture — FastAPI backend, PostgreSQL schema design, Docker deployment, and Plotly/Dash dashboard. Both collaborated on the preprocessing pipeline, testing, and report writing. Weekly meetings were held to review progress and resolve integration issues.

---

**Q98. If you were to redo this project, what would you do differently?**

**A:** (1) Collect real e-commerce event data from the start rather than relying on synthetic data; (2) implement real-time Kafka streaming from day one rather than batch processing; (3) experiment with Variational Autoencoders to get a smoother latent space for better clustering; (4) add a model monitoring module from the beginning to detect cluster drift in production; (5) include a more rigorous comparative study against baseline methods (raw K-Means, RFM segmentation).

---

**Q99. How long did this project take to complete?**

**A:** The project was completed over approximately 8 months (two semesters), following the Gantt chart: Month 1-2 (requirements and literature review), Month 3 (system design and database schema), Month 4-5 (Autoencoder and API development), Month 6 (K-Means integration and dashboard), Month 7 (testing and evaluation), Month 8 (report writing and finalization).

---

**Q100. What are the ethical considerations of your project?**

**A:**
1. **Data Privacy**: User behavioral data is sensitive. The system must comply with data protection principles — data minimization (collect only what's needed), user consent for tracking, and right to deletion.
2. **Bias in segmentation**: If training data is biased (e.g., over-representing certain demographic groups), clusters may reflect and reinforce existing biases, leading to discriminatory marketing.
3. **Transparency**: Users should know their data is being used for behavioral analysis. A clear privacy policy is required.
4. **Security**: Unauthorized access to behavioral profiles could expose sensitive user patterns. JWT authentication and HTTPS mitigate this.
5. **Misuse**: Segment-based targeting could be used manipulatively (e.g., targeting vulnerable users). Responsible use policies should accompany deployment.

---

**Q101. What is the significance of your project to the field of e-commerce in Nepal?**

**A:** Nepal's e-commerce sector is growing rapidly but most local platforms operate without any behavioral analytics infrastructure — decisions are made on intuition rather than data. Our project provides a locally deployable, open-source solution that does not require sending sensitive customer data to international SaaS platforms. It demonstrates that Nepali developers can build production-quality ML systems and contributes to the technical capability of the local tech ecosystem.

---

**Q102. What would be required to deploy this system in a real Nepali e-commerce business?**

**A:** (1) A VPS or cloud server (e.g., on DigitalOcean, AWS, or a local provider like Vianet/Subisu hosted servers) with at least 4GB RAM; (2) Integration with the business's existing website/app to send events to the FastAPI endpoint; (3) An initial data collection period (at least 2–4 weeks) to build behavioral profiles; (4) Staff training on reading the dashboard; (5) A data processing agreement documenting how user data is stored and used, for legal compliance.

---

**Q103. How is your project relevant to the BSc CSIT curriculum?**

**A:** This project integrates knowledge from multiple courses in the BSc CSIT curriculum: Artificial Intelligence (neural networks, autoencoder theory), Data Mining (clustering, CRISP-DM), Database Management Systems (PostgreSQL, SQL, normalization), Web Technology (REST APIs, HTTP), Software Engineering (requirements analysis, system design, testing), Statistics (normalization, evaluation metrics, distributions), and Operating Systems/Networking (Docker, containerization, API communication).

---

---

*End of Q&A Document — 103 Questions Total*
*Always relate answers back to your specific project, numbers, and implementation choices.*
*Good luck with your viva!*
